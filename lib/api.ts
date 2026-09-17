import { getApiBase } from "@/lib/config";
import { recordRequest } from "@/lib/history";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = "request_failed",
  ) {
    super(message);
  }
}

type RequestOptions = {
  signal?: AbortSignal;
  onUploadProgress?: (percent: number) => void;
  onDownloadProgress?: (percent: number) => void;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

function url(path: string): string {
  return `${getApiBase()}${path}`;
}

async function messageFromBlob(blob: Blob): Promise<{ message: string; code: string }> {
  try {
    const data = JSON.parse(await blob.text()) as { error?: { message?: string; code?: string } };
    return { message: data.error?.message || "The API request failed.", code: data.error?.code || "request_failed" };
  } catch {
    return { message: "The API request failed.", code: "request_failed" };
  }
}

export function requestImage(
  path: string,
  form: FormData,
  options: RequestOptions = {},
): Promise<{ blob: Blob; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const started = performance.now();
    let settled = false;
    const finish = (status: number) => {
      recordRequest({ method: "POST", path, status, durationMs: Math.round(performance.now() - started) });
      options.signal?.removeEventListener("abort", abort);
    };
    const abort = () => xhr.abort();
    xhr.open("POST", url(path));
    xhr.responseType = "blob";
    xhr.timeout = options.timeoutMs ?? 120_000;
    for (const [key, value] of Object.entries(options.headers || {})) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) options.onUploadProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onprogress = (event) => {
      if (event.lengthComputable) options.onDownloadProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = async () => {
      if (settled) return;
      settled = true;
      finish(xhr.status);
      if (xhr.status >= 200 && xhr.status < 300) {
        const duration = Number(xhr.getResponseHeader("X-Processing-Duration-Ms"));
        resolve({
          blob: xhr.response as Blob,
          durationMs: Number.isFinite(duration) && duration > 0 ? duration : Math.round(performance.now() - started),
        });
      } else {
        const error = await messageFromBlob(xhr.response as Blob);
        reject(new ApiError(error.message, xhr.status, error.code));
      }
    };
    xhr.onerror = () => {
      if (!settled) {
        settled = true;
        finish(0);
        reject(new ApiError("Could not connect to the API. Check that it is running and allows this origin."));
      }
    };
    xhr.ontimeout = () => {
      if (!settled) {
        settled = true;
        finish(0);
        reject(new ApiError("The request timed out. Try a smaller image or try again."));
      }
    };
    xhr.onabort = () => {
      if (!settled) {
        settled = true;
        finish(0);
        reject(new DOMException("Request canceled", "AbortError"));
      }
    };
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) {
      abort();
      return;
    }
    xhr.send(form);
  });
}

export async function requestJson<T>(path: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  const abort = () => controller.abort();
  init.signal?.addEventListener("abort", abort, { once: true });
  let status = 0;
  try {
    const response = await fetch(url(path), { ...init, signal: controller.signal, cache: "no-store" });
    status = response.status;
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
      throw new ApiError(body.error?.message || `Request failed (${status}).`, status, body.error?.code);
    }
    return (response.status === 204 ? {} : await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError("The request timed out or was canceled.");
    throw new ApiError("Could not connect to the API. Check that it is running and allows this origin.");
  } finally {
    window.clearTimeout(timeout);
    init.signal?.removeEventListener("abort", abort);
    recordRequest({ method: init.method || "GET", path, status, durationMs: Math.round(performance.now() - started) });
  }
}

export async function downloadFile(path: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url(path), { signal, cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new ApiError(body.error?.message || `Download failed (${response.status}).`, response.status);
  }
  return response.blob();
}

export function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
