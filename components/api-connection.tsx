"use client";

import { Check, CircleAlert, Link2, RefreshCw } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { requestJson } from "@/lib/api";
import { DEFAULT_API_BASE, getApiBase, setApiBase } from "@/lib/config";

const subscribe = (listener: () => void) => {
  window.addEventListener("bggone:api-base-changed", listener);
  return () => window.removeEventListener("bggone:api-base-changed", listener);
};

export default function ApiConnection() {
  const activeUrl = useSyncExternalStore(subscribe, getApiBase, () => DEFAULT_API_BASE);
  const [draft, setDraft] = useState(DEFAULT_API_BASE);
  const [status, setStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");
  const [message, setMessage] = useState("");
  const saveAndTest = async () => {
    try {
      setApiBase(draft.trim());
      setStatus("checking");
      setMessage("");
      await requestJson<{ status: string }>("/health");
      setStatus("connected");
      setMessage("API is reachable from this browser.");
    } catch (cause) {
      setStatus("error");
      setMessage(cause instanceof Error ? cause.message : "Could not connect to the API.");
    }
  };
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <Link2 size={18} />
        <h2 className="text-sm font-bold">Frontend connection</h2>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Change the API URL for this browser. It must include <code>/v1</code> and allow this frontend origin.
      </p>
      <label htmlFor="api-base-url" className="mt-4 block text-xs font-bold">
        API base URL
      </label>
      <input
        id="api-base-url"
        type="url"
        className="field mt-2 text-xs"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <p className="mt-2 break-all text-[11px] text-muted">Active: {activeUrl}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="button button-dark"
          disabled={status === "checking"}
          onClick={() => void saveAndTest()}
        >
          {status === "checking" ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
          {status === "checking" ? "Checking…" : "Save & test"}
        </button>
        <button type="button" className="button button-quiet" onClick={() => setDraft(activeUrl)}>
          Use active URL
        </button>
      </div>
      {message && (
        <p
          role="status"
          className={`mt-3 flex gap-2 text-xs ${status === "connected" ? "text-lime-700" : "text-red-600"}`}
        >
          {status === "connected" ? <Check size={15} /> : <CircleAlert size={15} />}
          {message}
        </p>
      )}
    </section>
  );
}
