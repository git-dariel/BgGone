import hashlib
import hmac
import secrets
import sqlite3
import threading
import time
from datetime import UTC, datetime
from pathlib import Path

from flask import g, request
from redis.exceptions import RedisError

from .errors import APIError

_buckets: dict[str, tuple[int, float]] = {}
_bucket_lock = threading.Lock()


def _connect(path: str):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, digest TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT, monthly_quota INTEGER NOT NULL)")
    db.execute("CREATE TABLE IF NOT EXISTS usage (key_id TEXT NOT NULL, month TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(key_id, month))")
    db.commit()
    return db


def create_key(settings) -> tuple[str, str]:
    key_id = secrets.token_hex(8)
    secret = "rbg_" + secrets.token_urlsafe(32)
    with _connect(settings.database_path) as db:
        db.execute("INSERT INTO api_keys VALUES (?, ?, ?, NULL, ?)", (key_id, hashlib.sha256(secret.encode()).hexdigest(), datetime.now(UTC).isoformat(), settings.key_monthly_quota))
    return key_id, secret


def revoke_key(settings, key_id: str) -> bool:
    with _connect(settings.database_path) as db:
        changed = db.execute("UPDATE api_keys SET revoked_at=? WHERE id=? AND revoked_at IS NULL", (datetime.now(UTC).isoformat(), key_id)).rowcount
    return bool(changed)


def key_usage(settings, key_id: str):
    month = datetime.now(UTC).strftime("%Y-%m")
    with _connect(settings.database_path) as db:
        row = db.execute("SELECT id, created_at, revoked_at, monthly_quota FROM api_keys WHERE id=?", (key_id,)).fetchone()
        if not row:
            raise APIError("not_found", "API key not found", 404)
        count = db.execute("SELECT count FROM usage WHERE key_id=? AND month=?", (key_id, month)).fetchone()
        return {**dict(row), "month": month, "used": count[0] if count else 0}


def require_admin(settings):
    if not settings.admin_token:
        raise APIError("admin_disabled", "Set ADMIN_TOKEN to manage keys", 503)
    token = request.headers.get("X-Admin-Token", "")
    if not hmac.compare_digest(token, settings.admin_token):
        raise APIError("unauthorized", "Invalid admin token", 401)


def _limit(identifier: str, maximum: int, redis_client=None):
    minute = int(time.time() // 60)
    bucket = f"rate:{identifier}:{minute}"
    try:
        if redis_client is not None:
            count = redis_client.incr(bucket)
            if count == 1:
                redis_client.expire(bucket, 120)
        else:
            raise ConnectionError("No Redis client")
    except (RedisError, OSError, ConnectionError):
        with _bucket_lock:
            count, previous_minute = _buckets.get(identifier, (0, minute))
            count = count + 1 if previous_minute == minute else 1
            _buckets[identifier] = (count, minute)
    if count > maximum:
        raise APIError("rate_limited", "Rate limit exceeded", 429)


def authorize(settings, redis_client=None, cost: int = 1):
    supplied = request.headers.get("X-API-Key", "")
    if not supplied:
        g.key_id = None
        _limit("anon:" + (request.remote_addr or "unknown"), settings.anonymous_rate_per_minute, redis_client)
        return
    digest = hashlib.sha256(supplied.encode()).hexdigest()
    month = datetime.now(UTC).strftime("%Y-%m")
    with _connect(settings.database_path) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT id, monthly_quota FROM api_keys WHERE digest=? AND revoked_at IS NULL", (digest,)).fetchone()
        if not row:
            raise APIError("invalid_api_key", "Invalid or revoked API key", 401)
        _limit("key:" + row["id"], settings.key_rate_per_minute, redis_client)
        used = db.execute("SELECT count FROM usage WHERE key_id=? AND month=?", (row["id"], month)).fetchone()
        if (used[0] if used else 0) + cost > row["monthly_quota"]:
            raise APIError("quota_exceeded", "Monthly usage quota exceeded", 429)
        db.execute("INSERT INTO usage(key_id,month,count) VALUES(?,?,?) ON CONFLICT(key_id,month) DO UPDATE SET count=count+excluded.count", (row["id"], month, cost))
        g.key_id = row["id"]
