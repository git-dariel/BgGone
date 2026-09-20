import { ArrowUpRight, Box, Images, LockKeyhole, WandSparkles } from "lucide-react";
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
          <LockKeyhole size={27} />
          <span className="mini-label">PRIVACY, PLAINLY</span>
          <h2>
            Your images,
            <br />
            your call.
          </h2>
          <p>
            A single image is processed in memory. Batch files are kept temporarily and expire automatically. Host the
            API yourself if you need complete control.
          </p>
          <Link href="/self-host">
            Self-hosting guide <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="closing-cell">
          <span className="api-glyph">{`{ }`}</span>
          <span className="mini-label">BUILT FOR DEVELOPERS</span>
          <h2>
            Make it part
            <br />
            of your flow.
          </h2>
          <p>
            Use the same endpoints behind this studio in your own product. Image edits, masks, batch jobs, and keys are
            documented.
          </p>
          <Link href="/api">
            Explore the API <ArrowUpRight size={17} />
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
