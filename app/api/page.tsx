import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Braces, KeyRound, LockKeyhole } from "lucide-react";
import Link from "next/link";
import KeyDashboard from "@/components/key-dashboard";
import CopyableExamples from "@/components/copyable-examples";

export const metadata: Metadata = {
  title: "API & keys",
  description: "Background removal API endpoints, examples, and API key management.",
};

const endpoints = [
  ["POST", "/background/remove", "Transparent cutout in PNG or WebP"],
  ["POST", "/mask", "Grayscale subject mask"],
  ["POST", "/background/replace", "Solid, image, or transparent backdrop"],
  ["POST", "/background/blur", "Blur the original backdrop"],
  ["POST", "/batch", "Queue multiple images"],
  ["GET", "/batch/{id}", "Check job and per-image status"],
  ["GET", "/batch/{id}/download", "Download the finished ZIP"],
];

export default function ApiPage() {
  return (
    <main className="page-shell py-10 md:py-16">
      <div className="border-t border-ink pt-4">
        <span className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] text-lime-700">
          <Braces size={16} /> THE API / 03
        </span>
        <h1 className="mt-7 text-[clamp(46px,6vw,86px)] leading-[1.02] font-semibold tracking-[-0.07em]">
          The same cut,
          <br />
          <span className="font-serif font-normal italic text-[#789462]">in your workflow.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted">
          Upload an image as multipart form data. Get a full-resolution result or a job ID you can poll. No wrapper
          required.
        </p>
      </div>
      <div className="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-lime-700">ENDPOINTS</span>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">Image operations</h2>
              </div>
              <span className="rounded-full bg-surface-alt px-3 py-1.5 font-mono text-[11px]">/v1</span>
            </div>
            <div className="mt-6 divide-y divide-line border-t border-line">
              {endpoints.map(([method, path, description]) => (
                <div className="grid gap-2 py-4 sm:grid-cols-[54px_1fr] sm:gap-4" key={path}>
                  <span
                    className={`self-start rounded px-1.5 py-1 text-center font-mono text-[10px] font-bold ${method === "POST" ? "bg-accent text-[#1d251f]" : "bg-surface-alt text-ink"}`}
                  >
                    {method}
                  </span>
                  <div className="min-w-0">
                    <code className="break-all text-[13px] font-bold">{path}</code>
                    <p className="m-0 mt-1 text-xs text-muted">{description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted">
              Upload fields: <code>image</code> for one image, <code>images</code> for batches. JPG, PNG, and WebP are
              accepted. Errors return JSON with <code>error.code</code>, <code>error.message</code>, and a request ID.
            </p>
          </div>
          <CodeExamples />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-surface p-5">
              <LockKeyhole size={22} className="text-lime-700" />
              <h3 className="mt-4 text-lg font-semibold">Authentication</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Processing is available anonymously with a lower rate limit. Send a generated key in{" "}
                <code>X-API-Key</code> for per-key limits and usage accounting.
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface p-5">
              <ArrowRight size={22} className="text-lime-700" />
              <h3 className="mt-4 text-lg font-semibold">Self-host the stack</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Keep the API, worker, Redis, and model cache on infrastructure you control.
              </p>
              <Link href="/self-host" className="mt-3 inline-flex items-center gap-1 text-xs font-bold">
                Read the guide <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
        <aside className="min-w-0">
          <div className="sticky top-24">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound size={19} />
              <h2 className="text-xl font-semibold tracking-tight">API key desk</h2>
            </div>
            <KeyDashboard />
          </div>
        </aside>
      </div>
    </main>
  );
}

function CodeExamples() {
  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-extrabold tracking-[0.16em] text-lime-700">QUICK START</span>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Send your first image</h2>
        </div>
      </div>
      <CopyableExamples />
    </div>
  );
}
