"use client";

import { ArrowRight, Check, Copy, KeyRound, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { requestJson } from "@/lib/api";
import { getHistory } from "@/lib/history";
import type { RequestRecord } from "@/lib/history";
import { Modal, useToast } from "@/components/ui";

type KeyUsage = {
  id: string;
  month: string;
  used: number;
  monthly_quota: number;
  created_at: string;
  revoked_at: string | null;
};

export default function KeyDashboard() {
  const toast = useToast();
  const [token, setToken] = useState("");
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [usage, setUsage] = useState<KeyUsage | null>(null);
  const [history, setHistory] = useState<RequestRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  useEffect(() => {
    const update = () => setHistory(getHistory());
    const initial = window.setTimeout(update, 0);
    window.addEventListener("bggone:history", update);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("bggone:history", update);
    };
  }, []);

  const headers = { "X-Admin-Token": token };
  const create = async () => {
    if (!token.trim()) {
      setError("Enter the admin token configured on your API.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await requestJson<{ id: string; api_key: string }>("/keys", { method: "POST", headers });
      setKeyId(result.id);
      setSecret(result.api_key);
      setUsage(null);
      toast("API key created.", "success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create a key.");
    } finally {
      setBusy(false);
    }
  };
  const fetchUsage = async () => {
    if (!token.trim() || !keyId.trim()) {
      setError("Enter an admin token and key ID.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setUsage(await requestJson<KeyUsage>(`/keys/${encodeURIComponent(keyId.trim())}/usage`, { headers }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load usage.");
    } finally {
      setBusy(false);
    }
  };
  const revoke = async () => {
    if (!token.trim() || !keyId.trim()) return;
    setBusy(true);
    setError("");
    try {
      await requestJson(`/keys/${encodeURIComponent(keyId.trim())}`, { method: "DELETE", headers });
      setUsage((current) => (current ? { ...current, revoked_at: new Date().toISOString() } : null));
      toast("Key revoked.", "success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not revoke this key.");
    } finally {
      setBusy(false);
      setConfirmRevoke(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      toast("Key copied. Store it somewhere safe.", "success");
    } catch {
      toast("Could not copy the key.", "error");
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <p className="m-0 text-xs leading-relaxed text-muted">
        Manage keys using the API’s admin token. The key secret is shown once and is not saved by this page.
      </p>
      <label className="mt-5 block text-xs font-bold" htmlFor="admin-token">
        Admin token
      </label>
      <input
        id="admin-token"
        type="password"
        autoComplete="off"
        className="field mt-2"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        placeholder="Enter ADMIN_TOKEN"
      />
      <button className="button button-dark mt-3 w-full" type="button" disabled={busy} onClick={() => void create()}>
        <KeyRound size={17} />
        {busy ? "Working…" : "Generate API key"}
      </button>
      <div className="my-6 h-px bg-line" />
      <label className="block text-xs font-bold" htmlFor="key-id">
        Key ID
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="key-id"
          className="field min-w-0 flex-1"
          value={keyId}
          onChange={(event) => setKeyId(event.target.value)}
          placeholder="Paste a key ID"
        />
        <button
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-surface-alt"
          type="button"
          aria-label="Refresh key usage"
          disabled={busy}
          onClick={() => void fetchUsage()}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      <div className="mt-3 flex gap-3">
        <button type="button" className="text-button" disabled={busy} onClick={() => void fetchUsage()}>
          View usage <ArrowRight size={14} />
        </button>
        <button
          type="button"
          className="text-button text-red-600"
          disabled={!keyId || busy}
          onClick={() => setConfirmRevoke(true)}
        >
          <Trash2 size={14} /> Revoke
        </button>
      </div>
      {usage && (
        <div className="mt-5 rounded-xl border border-line bg-paper p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-muted">{usage.month} USAGE</span>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold ${usage.revoked_at ? "bg-red-100 text-red-700" : "bg-lime-200 text-lime-900"}`}
            >
              {usage.revoked_at ? "Revoked" : "Active"}
            </span>
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">
            {usage.used.toLocaleString()}{" "}
            <span className="text-base font-medium text-muted">/ {usage.monthly_quota.toLocaleString()}</span>
          </div>
          <p className="mb-0 mt-2 text-[11px] text-muted">Requests counted toward this key’s monthly quota.</p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 flex gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          <ShieldAlert size={17} className="shrink-0" />
          {error}
        </p>
      )}
      <div className="my-6 h-px bg-line" />
      <h3 className="text-sm font-bold">Request history</h3>
      <p className="mt-1 text-[11px] text-muted">This browser tab only. The API does not provide a history endpoint.</p>
      {history.length ? (
        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
          {history.slice(0, 8).map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-2 border-b border-line pb-2 text-[11px]"
            >
              <span className="min-w-0 truncate font-mono">
                {entry.method} {entry.path}
              </span>
              <span
                className={`shrink-0 font-bold ${entry.status >= 400 || entry.status === 0 ? "text-red-600" : "text-lime-700"}`}
              >
                {entry.status || "ERR"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-line p-3 text-xs text-muted">
          No requests in this tab yet.
        </p>
      )}
      <div className="mt-5 rounded-lg bg-surface-alt p-3 text-[11px] leading-relaxed text-muted">
        <strong className="text-ink">Default limits</strong>
        <br />
        20 anonymous requests/min · 120 per key/min · 10,000 per key/month. Your server configuration may differ.
      </div>
      {secret && (
        <Modal title="Your new API key" onClose={() => setSecret("")}>
          <p className="modal-copy">
            Copy this secret now. You will not be able to view it again after closing this dialog.
          </p>
          <div className="break-all rounded-lg border border-line bg-paper p-3 font-mono text-xs">{secret}</div>
          <p className="mt-3 text-xs text-muted">Key ID: {keyId}</p>
          <div className="modal-actions mt-5">
            <button className="button button-quiet" onClick={() => setSecret("")}>
              Done
            </button>
            <button className="button button-dark" onClick={() => void copy()}>
              <Copy size={16} /> Copy key
            </button>
          </div>
        </Modal>
      )}
      {confirmRevoke && (
        <Modal title="Revoke this API key?" onClose={() => setConfirmRevoke(false)}>
          <p className="modal-copy">Requests using this key will stop working immediately. This cannot be undone.</p>
          <div className="modal-actions">
            <button className="button button-quiet" onClick={() => setConfirmRevoke(false)}>
              Keep key
            </button>
            <button className="button button-dark" disabled={busy} onClick={() => void revoke()}>
              <Check size={16} /> Revoke key
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
