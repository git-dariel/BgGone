import { Accessibility, ArrowUpRight, Box, GitPullRequest, Images, WandSparkles } from "lucide-react";
import Link from "next/link";
import Workspace from "@/components/workspace";
import { GITHUB_REPO_URL } from "@/lib/config";

export default function Home() {
  return (
    <main>
      <Workspace />
      <section className="how-section page-shell">
        <div className="section-heading">
          <span className="work-index">02 / THE PROCESS</span>
          <h2>
            From cluttered to <em>considered.</em>
          </h2>
          <p>Just enough control to get it right. No heavyweight editing suite required.</p>
        </div>
        <div className="process-list">
          <div>
            <span className="process-number">01</span>
            <WandSparkles size={27} />
            <h3>Find the subject</h3>
            <p>Upload a photo. The API creates a transparent cutout at the original size.</p>
          </div>
          <div>
            <span className="process-number">02</span>
            <Box size={27} />
            <h3>Set the scene</h3>
            <p>Keep it clear, pick a color, add your own image, or blur what was there.</p>
          </div>
          <div>
            <span className="process-number">03</span>
            <Images size={27} />
            <h3>Take it further</h3>
            <p>Fine-tune the mask and export a clean PNG or compact WebP.</p>
          </div>
        </div>
      </section>
      <section className="feature-band">
        <div className="feature-band-inner page-shell">
          <div>
            <span className="mini-label">MORE THAN ONE IMAGE?</span>
            <h2>
              One queue.
              <br />
              <em>Every cut.</em>
            </h2>
            <p>Process a set asynchronously and download the finished images together in a ZIP.</p>
            <Link href="/batch" className="button button-accent">
              Open batch studio <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="batch-graphic" aria-hidden="true">
            <span>
              01 <i />
            </span>
            <span>
              02 <i />
            </span>
            <span>
              03 <i />
            </span>
            <div className="batch-graphic-result">
              <CheckIcon /> ZIP READY
            </div>
          </div>
        </div>
      </section>
      <section className="closing-grid page-shell">
        <div className="closing-cell">
          <Accessibility size={27} />
          <span className="mini-label">OPEN TO EVERYONE</span>
          <h2>
            Make BgGone
            <br />
            more accessible.
          </h2>
          <p>
            Help improve keyboard access, screen-reader support, contrast, and the experience on every device.
          </p>
          <Link href="/contribute">
            See how to contribute <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="closing-cell">
          <GitPullRequest size={27} />
          <span className="mini-label">BUILT IN PUBLIC</span>
          <h2>
            Better cuts.
            <br />
            More possibilities.
          </h2>
          <p>
            Contribute fixes, edge-quality improvements, thoughtful features, or clearer documentation on GitHub.
          </p>
          <Link href="/contribute">
            Join the project <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
      {GITHUB_REPO_URL && (
        <section className="open-source-strip page-shell">
          <span>OPEN SOURCE / SELF-HOSTABLE</span>
          <p>Run the stack on your terms, contribute a fix, or take a closer look at the code.</p>
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
            View the repository <ArrowUpRight size={16} />
          </a>
        </section>
      )}
      <section className="border-t border-line bg-surface" aria-labelledby="contact-title">
        <div className="page-shell grid gap-8 py-14 md:grid-cols-[0.55fr_1fr] md:items-end md:py-18">
          <span className="mini-label">CONTACT / SAY HELLO</span>
          <div>
            <h2
              id="contact-title"
              className="m-0 text-[clamp(34px,4.8vw,64px)] leading-[1.02] font-semibold tracking-[-0.06em]"
            >
              Questions, feedback,
              <br />
              or a good idea?
            </h2>
            <a
              className="mt-7 inline-flex items-center gap-3 border-b border-ink pb-2 text-sm font-bold sm:text-base"
              href="mailto:dariel.v.avila@gmail.com"
            >
              dariel.v.avila@gmail.com <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path
        d="m3 9 3.4 3.4L14 4.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
