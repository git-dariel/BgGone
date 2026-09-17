"use client";

import { ArrowDownToLine, CircleAlert, FileImage, LoaderCircle, RotateCcw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { downloadFile, requestJson, saveBlob } from "@/lib/api";
import { MAX_BATCH_SIZE } from "@/lib/config";
import { validateImage } from "@/lib/files";
import { UploadZone } from "@/components/upload-zone";
import { Modal, Progress, useToast } from "@/components/ui";

type QueueItem = { id: string; file: File };
type ItemStatus = { filename: string; status: string; output?: string; error?: string; duration_ms?: number };
type BatchStatus = { status: "queued" | "processing" | "complete" | "failed" | "canceled"; items: ItemStatus[] };

export default function BatchWorkspace() {
  const toast = useToast();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [submitted, setSubmitted] = useState<QueueItem[]>([]);
  const [batchId, setBatchId] = useState("");
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const pollAbort = useRef<AbortController | null>(null);

  const addFiles = async (files: File[]) => {
    const accepted: QueueItem[] = [];
    for (const file of files) {
      try {
        await validateImage(file);
        accepted.push({ id: crypto.randomUUID(), file });
      } catch (cause) {
        toast(`${file.name}: ${cause instanceof Error ? cause.message : "Invalid image."}`, "error");
      }
    }
    setQueue((current) => {
      const remaining = Math.max(0, MAX_BATCH_SIZE - current.length);
      if (accepted.length > remaining) toast(`A batch can contain up to ${MAX_BATCH_SIZE} images.`, "error");
      return [...current, ...accepted.slice(0, remaining)];
    });
  };

  const submit = async (items: QueueItem[]) => {
    if (!items.length) return;
    setBusy(true);
    setError("");
    setStatus(null);
    setBatchId("");
    setSubmitted(items);
    const form = new FormData();
    items.forEach((item) => form.append("images", item.file));
    try {
      const response = await requestJson<{ id: string; status: string }>(
        "/batch",
        { method: "POST", body: form },
        120_000,
      );
      setBatchId(response.id);
      setStatus({ status: "queued", items: items.map((item) => ({ filename: item.file.name, status: "queued" })) });
      toast("Batch queued. Processing starts as soon as a worker is available.", "success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Batch could not be queued.");
    } finally {
      setBusy(false);
    }
  };

  const poll = useCallback(async (id: string, signal: AbortSignal) => {
    try {
      const result = await requestJson<BatchStatus>(`/batch/${id}`, { signal });
      if (!signal.aborted) setStatus(result);
      return result.status;
    } catch (cause) {
      if (!signal.aborted) setError(cause instanceof Error ? cause.message : "Could not check batch status.");
      return "failed";
    }
  }, []);

  useEffect(() => {
    if (!batchId) return;
    const abort = new AbortController();
    pollAbort.current = abort;
    let timer: number | undefined;
    const tick = async () => {
      const next = await poll(batchId, abort.signal);
      if (!abort.signal.aborted && (next === "queued" || next === "processing")) timer = window.setTimeout(tick, 1800);
    };
    timer = window.setTimeout(tick, 1000);
    return () => {
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [batchId, poll]);

  const cancel = async () => {
    if (!batchId) return;
    try {
      await requestJson(`/batch/${batchId}`, { method: "DELETE" });
      setStatus((current) => (current ? { ...current, status: "canceled" } : null));
      setBatchId("");
      toast("Batch canceled.", "success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel batch.");
    }
    setCancelOpen(false);
  };

  const download = async () => {
    if (!batchId) return;
    setDownloading(true);
    setError("");
    try {
      const blob = await downloadFile(`/batch/${batchId}/download`);
      saveBlob(blob, `bggone-batch-${batchId.slice(0, 8)}.zip`);
      toast("ZIP downloaded.", "success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  const retryFailed = () => {
    if (!status) return;
    const failed = submitted.filter((_, index) => status.items[index]?.status === "failed");
    setQueue(failed);
    setSubmitted([]);
    setBatchId("");
    setStatus(null);
    setError("");
    toast("Failed images are back in the queue.");
  };

  const completeCount =
    status?.items.filter((item) => item.status === "complete" || item.status === "failed").length || 0;
  const progress = status ? Math.round((completeCount / Math.max(1, status.items.length)) * 100) : 0;
  const active = status?.status === "queued" || status?.status === "processing";
  return (
    <div className="grid overflow-hidden rounded-2xl border border-line bg-surface shadow-xl lg:grid-cols-[1fr_1fr]">
      <section
        className="border-b border-line p-4 sm:p-7 lg:border-r lg:border-b-0"
        aria-labelledby="batch-queue-heading"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold tracking-[0.16em] text-lime-700">BUILD YOUR QUEUE</span>
            <h2 id="batch-queue-heading" className="mt-1 text-2xl font-semibold tracking-tight">
              Images to process
            </h2>
          </div>
          <span className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-muted">
            {queue.length} / {MAX_BATCH_SIZE}
          </span>
        </div>
        <UploadZone onFiles={(files) => void addFiles(files)} multiple compact />
        <div className="mt-5 space-y-2">
          {queue.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-muted">
              Your queue is empty. Add up to {MAX_BATCH_SIZE} images to begin.
            </p>
          ) : (
            queue.map((item, index) => (
              <div className="flex items-center gap-3 rounded-lg border border-line bg-paper p-3" key={item.id}>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/45">
                  <FileImage size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-xs">{item.file.name}</strong>
                  <span className="text-[11px] text-muted">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB · #{index + 1}
                  </span>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => setQueue((current) => current.filter((entry) => entry.id !== item.id))}
                  disabled={active || busy}
                >
                  <X size={17} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="button button-dark"
            disabled={!queue.length || busy || active}
            onClick={() => void submit(queue)}
          >
            {busy ? <LoaderCircle className="animate-spin" size={17} /> : <RotateCcw size={17} />}
            {busy ? "Submitting…" : "Process batch"}
          </button>
          <button
            type="button"
            className="button button-quiet"
            disabled={!queue.length || active || busy}
            onClick={() => setQueue([])}
          >
            <Trash2 size={16} /> Clear queue
          </button>
        </div>
      </section>
      <section className="bg-paper p-4 sm:p-7" aria-labelledby="batch-progress-heading">
        <span className="text-[11px] font-extrabold tracking-[0.16em] text-lime-700">JOB STATUS</span>
        <h2 id="batch-progress-heading" className="mt-1 text-2xl font-semibold tracking-tight">
          Results desk
        </h2>
        {!status ? (
          <div className="mt-8 grid min-h-[300px] place-items-center rounded-xl border border-dashed border-line px-5 text-center">
            <div>
              <Layers3Icon />
              <h3 className="mt-3 text-lg font-semibold">Nothing running yet.</h3>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                Add your images and start processing. Per-image progress will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-line bg-surface p-4">
              <div className="mb-3 flex justify-between gap-3 text-xs font-bold">
                <span className="capitalize">{status.status}</span>
                <span>
                  {completeCount} / {status.items.length} finished
                </span>
              </div>
              <Progress value={progress} label="Batch progress" />
              <p className="mt-2 break-all text-[11px] text-muted">
                Job {batchId.slice(0, 8)} · Results expire after the server retention period.
              </p>
            </div>
            <div className="mt-4 space-y-2" aria-live="polite">
              {status.items.map((item, index) => (
                <div
                  className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-3"
                  key={`${index}-${item.filename}`}
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-xs">{item.filename}</strong>
                    {item.error && <span className="text-[11px] text-red-600">{item.error}</span>}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold capitalize ${item.status === "complete" ? "bg-lime-200 text-lime-900" : item.status === "failed" ? "bg-red-100 text-red-700" : "bg-surface-alt text-muted"}`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {status.status === "complete" && (
                <button
                  type="button"
                  className="button button-accent"
                  disabled={downloading}
                  onClick={() => void download()}
                >
                  <ArrowDownToLine size={17} />
                  {downloading ? "Preparing ZIP…" : "Download all · ZIP"}
                </button>
              )}
              {active && (
                <button type="button" className="button button-outline" onClick={() => setCancelOpen(true)}>
                  Cancel job
                </button>
              )}
              {status.items.some((item) => item.status === "failed") && (
                <button type="button" className="button button-outline" onClick={retryFailed}>
                  <RotateCcw size={16} /> Retry failed
                </button>
              )}
            </div>
          </>
        )}
        {error && (
          <div
            className="mt-4 flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700"
            role="alert"
          >
            <CircleAlert size={17} className="shrink-0" />
            {error}
          </div>
        )}
        <p className="mt-8 text-xs leading-relaxed text-muted">
          Batch processing requires Redis and a running worker service. Single-image processing works without them.
        </p>
      </section>
      {cancelOpen && (
        <Modal title="Cancel this batch?" onClose={() => setCancelOpen(false)}>
          <p className="modal-copy">
            The current job will stop. You can start a fresh one with the images in your queue.
          </p>
          <div className="modal-actions">
            <button className="button button-quiet" onClick={() => setCancelOpen(false)}>
              Keep running
            </button>
            <button className="button button-dark" onClick={() => void cancel()}>
              Cancel batch
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Layers3Icon() {
  return (
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/50">
      <FileImage size={26} />
    </div>
  );
}
