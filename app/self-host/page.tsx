import type { Metadata } from "next";
import { ArrowUpRight, Boxes, Cpu, Database, HardDrive, Server, ShieldCheck, Zap } from "lucide-react";
import { GITHUB_REPO_URL } from "@/lib/config";
import ApiConnection from "@/components/api-connection";

export const metadata: Metadata = {
  title: "Self-hosting",
  description: "Run the BgGone API, worker, Redis, and model cache on your own infrastructure.",
};

const envRows = [
  ["MODEL", "birefnet-lite for faster CPU processing; birefnet-portrait for detailed portraits"],
  ["EDGE_REFINEMENT", "auto, alpha, or none"],
  ["DEVICE", "cpu or gpu"],
  ["ALLOWED_ORIGINS", "Frontend origins allowed by CORS"],
  ["MAX_UPLOAD_MB", "Per-image upload limit"],
  ["MAX_BATCH_SIZE", "Images allowed in one batch"],
  ["BATCH_RETENTION_SECONDS", "How long ZIP results remain"],
  ["ADMIN_TOKEN", "Required for key management"],
  ["REDIS_URL", "Queue and shared rate-limit backend"],
];

export default function SelfHostPage() {
  return (
    <main className="page-shell py-10 md:py-16">
      <div className="border-t border-ink pt-4">
        <span className="flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em] text-lime-700">
          <Server size={16} /> SELF-HOST / 04
        </span>
        <h1 className="mt-7 text-[clamp(46px,6vw,86px)] leading-[1.02] font-semibold tracking-[-0.07em]">
          Your images.
          <br />
          <span className="font-serif font-normal italic text-[#789462]">Your infrastructure.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted">
          The studio talks to a Flask API. Run that API and its batch worker on a CPU machine or an NVIDIA GPU host.
        </p>
      </div>
      <div className="mt-12 grid gap-7 lg:grid-cols-[minmax(0,1fr)_350px]">
        <div className="min-w-0 space-y-7">
          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent">
                <Boxes size={21} className="text-[#1d251f]" />
              </span>
              <div>
                <span className="text-[11px] font-extrabold tracking-[0.16em] text-lime-700">QUICK START</span>
                <h2 className="text-2xl font-semibold tracking-tight">Docker Compose</h2>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">
              From the repository root, copy the API environment file, set a long random admin token, then start the
              stack.
            </p>
            <CodeBlock
              code={`Copy-Item api/.env.example api/.env\n# Edit ADMIN_TOKEN in api/.env\ndocker compose up --build`}
            />
            <p className="mt-4 text-xs text-muted">
              The API is available at <code>http://localhost:5000/v1</code>. The first start downloads model weights, so
              readiness can take a few minutes.
            </p>
          </section>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
            <section className="min-w-0 rounded-2xl border border-line bg-surface p-5">
              <Cpu size={25} className="text-lime-700" />
              <h2 className="mt-5 text-xl font-semibold">CPU deployment</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                The default Dockerfile installs the CPU inference backend and works without a GPU.
              </p>
              <CodeBlock code="docker compose up --build" small />
            </section>
            <section className="min-w-0 rounded-2xl border border-line bg-surface p-5">
              <Zap size={25} className="text-lime-700" />
              <h2 className="mt-5 text-xl font-semibold">NVIDIA GPU</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Use a compatible NVIDIA host with Docker GPU support. The GPU override switches the image and reserves a
                device.
              </p>
              <CodeBlock code="docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build" small />
            </section>
          </div>
          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
            <span className="text-[11px] font-extrabold tracking-[0.16em] text-lime-700">CONFIGURATION</span>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Environment variables</h2>
            <div className="mt-5 divide-y divide-line border-t border-line">
              {envRows.map(([name, meaning]) => (
                <div className="grid gap-1 py-3 sm:grid-cols-[210px_1fr] sm:gap-3" key={name}>
                  <code className="break-all text-xs font-bold">{name}</code>
                  <span className="text-xs text-muted">{meaning}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              See <code>api/.env.example</code> for every setting. Keep admin tokens out of the frontend environment.
            </p>
          </section>
        </div>
        <aside className="space-y-5">
          <ApiConnection />
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <HardDrive size={18} />
              <h2 className="text-sm font-bold">What is stored?</h2>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Single-image uploads are processed in memory. Batch inputs live temporarily in Redis and ZIP results in
              the configured batch directory. Model weights are cached on a persistent volume.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <Database size={18} />
              <h2 className="text-sm font-bold">Services in the stack</h2>
            </div>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              <li>API · Flask and Gunicorn</li>
              <li>Worker · RQ background jobs</li>
              <li>Redis · queue and rate limits</li>
              <li>Volumes · model cache and batch results</li>
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-accent/40 p-5">
            <ShieldCheck size={20} />
            <p className="mt-2 text-xs leading-relaxed">
              Set <strong>ALLOWED_ORIGINS</strong> to your frontend URL before using the app from another host.
            </p>
          </div>
          {GITHUB_REPO_URL && (
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-sm font-bold">Open source</h2>
              <div className="mt-3 grid gap-2 text-xs font-semibold">
                <a className="flex items-center gap-1" href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                  Repository <ArrowUpRight size={14} />
                </a>
                <a
                  className="flex items-center gap-1"
                  href={`${GITHUB_REPO_URL}/blob/main/CONTRIBUTING.md`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Contribute <ArrowUpRight size={14} />
                </a>
                <a
                  className="flex items-center gap-1"
                  href={`${GITHUB_REPO_URL}/issues/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Report an issue <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function CodeBlock({ code, small = false }: { code: string; small?: boolean }) {
  return (
    <pre
      className={`max-w-full overflow-x-auto rounded-lg bg-[#1d251f] p-4 font-mono leading-relaxed text-[#d7efbe] ${small ? "mt-4 text-[11px]" : "mt-5 text-xs"}`}
    >
      <code>{code}</code>
    </pre>
  );
}
