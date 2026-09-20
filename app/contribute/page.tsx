import type { Metadata } from "next";
import {
  Accessibility,
  ArrowUpRight,
  Bug,
  Gauge,
  GitFork,
  GitPullRequest,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { GITHUB_REPO_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Contribute",
  description: "BgGone is open source. Help improve accessibility, cutout quality, performance, and future features.",
};

const repositoryUrl = GITHUB_REPO_URL || "https://github.com/git-dariel/BgGone";
const repositoryLabel = repositoryUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

const contributionAreas = [
  {
    number: "01",
    icon: Accessibility,
    title: "Make it accessible",
    copy: "Improve keyboard flows, screen-reader support, contrast, and the experience on smaller or slower devices.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Improve cutout quality",
    copy: "Help BgGone retain difficult hair, fur, and soft edges while keeping the model practical on modest hardware.",
  },
  {
    number: "03",
    icon: Gauge,
    title: "Keep it fast",
    copy: "Reduce memory use, shorten processing time, and make local or hosted deployments more dependable.",
  },
  {
    number: "04",
    icon: Lightbulb,
    title: "Shape what comes next",
    copy: "Propose useful editing tools, export options, documentation, and workflows that solve real image problems.",
  },
];

export default function ContributePage() {
  return (
    <main>
      <section className="page-shell py-8 md:py-12">
        <div className="border-t border-ink pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="work-index flex items-center gap-2 text-[11px] font-extrabold tracking-[0.16em]">
              <GitFork size={16} /> CONTRIBUTE / OPEN SOURCE
            </span>
            <span className="rounded-full border border-line px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-muted">
              PUBLIC REPOSITORY
            </span>
          </div>

          <div className="grid gap-10 py-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:items-end lg:py-16">
            <div>
              <h1 className="m-0 max-w-[920px] text-[clamp(52px,8vw,112px)] leading-[0.94] font-semibold tracking-[-0.075em]">
                BgGone is
                <br />
                <span className="font-serif font-normal italic text-[#789462]">open source.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-[clamp(16px,1.6vw,20px)] leading-relaxed text-muted">
                The code is public, the roadmap is open, and every thoughtful contribution can make background removal
                more useful for more people.
              </p>
            </div>

            <a
              className="group block overflow-hidden rounded-2xl border border-charcoal bg-charcoal text-white shadow-2xl transition-transform hover:-translate-y-1"
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View BgGone repository on GitHub"
            >
              <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
                <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-lime-200">BGGONE / MAIN</span>
                <GitFork size={22} />
              </div>
              <div className="px-5 py-7 sm:px-7 sm:py-8">
                <span className="text-[11px] font-extrabold tracking-[0.14em] text-white/55">GITHUB REPOSITORY</span>
                <strong className="mt-3 block break-words text-xl leading-snug tracking-tight sm:text-2xl">
                  {repositoryLabel}
                </strong>
                <span className="mt-7 flex items-center justify-between border-t border-white/15 pt-4 text-xs font-bold">
                  View the source
                  <ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={18} />
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className="bg-accent text-[#1d251f]">
        <div className="page-shell grid gap-7 py-12 md:grid-cols-[0.65fr_1.35fr] md:items-end md:py-16">
          <span className="text-[11px] font-extrabold tracking-[0.16em]">WHY CONTRIBUTE?</span>
          <p className="m-0 text-[clamp(30px,4.5vw,62px)] leading-[1.02] font-semibold tracking-[-0.06em]">
            Help make clean cutouts more accessible, more accurate, and more capable.
          </p>
        </div>
      </section>

      <section className="page-shell py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
          <div>
            <span className="work-index">WHERE TO HELP / 01—04</span>
            <h2 className="mt-4 text-[clamp(34px,4vw,54px)] leading-[1.02] font-semibold tracking-[-0.055em]">
              Bring what
              <br />
              you know.
            </h2>
            <p className="mt-5 max-w-[290px] text-sm leading-relaxed text-muted">
              Code, testing, design feedback, bug reports, and documentation all move the project forward.
            </p>
          </div>

          <div className="border-t border-ink">
            {contributionAreas.map(({ number, icon: Icon, title, copy }) => (
              <article
                className="grid gap-4 border-b border-line py-7 sm:grid-cols-[50px_48px_minmax(180px,0.8fr)_1.2fr] sm:items-start"
                key={number}
              >
                <span className="font-mono text-[11px] font-bold text-muted">{number}</span>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-alt text-lime-700">
                  <Icon size={21} />
                </span>
                <h3 className="m-0 text-xl font-semibold tracking-tight">{title}</h3>
                <p className="m-0 text-sm leading-relaxed text-muted">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-charcoal text-white">
        <div className="page-shell grid gap-12 py-16 lg:grid-cols-[1fr_1fr] lg:items-end lg:py-20">
          <div>
            <span className="text-[11px] font-extrabold tracking-[0.16em] text-lime-200">START WITH ONE THING</span>
            <h2 className="mt-4 max-w-[700px] text-[clamp(39px,5.4vw,74px)] leading-[0.98] font-semibold tracking-[-0.065em]">
              Notice a rough edge?
              <br />
              <span className="font-serif font-normal italic text-accent">Help smooth it out.</span>
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              className="flex min-h-28 flex-col justify-between rounded-xl border border-white/20 p-5 transition-colors hover:bg-white/10"
              href={`${repositoryUrl}/issues/new`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Bug size={22} className="text-accent" />
              <span className="flex items-end justify-between gap-3 font-bold">
                Report an issue <ArrowUpRight size={17} />
              </span>
            </a>
            <a
              className="flex min-h-28 flex-col justify-between rounded-xl bg-accent p-5 text-[#1d251f] transition-colors hover:bg-lime-300"
              href={`${repositoryUrl}/pulls`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitPullRequest size={22} />
              <span className="flex items-end justify-between gap-3 font-bold">
                Open a pull request <ArrowUpRight size={17} />
              </span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
