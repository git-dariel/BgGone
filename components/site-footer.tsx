import { ArrowUpRight, Layers2 } from "lucide-react";
import Link from "next/link";
import { GITHUB_REPO_URL } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-mark">
            <Layers2 size={17} />
          </span>
          <strong>BgGone.</strong>
          <span>Make the subject the story.</span>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/batch">Batch</Link>
          <Link href="/api">API</Link>
          <Link href="/self-host">Self-host</Link>
          {GITHUB_REPO_URL && (
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub <ArrowUpRight size={14} />
            </a>
          )}
        </nav>
        <small>Images stay in your browser until you choose to process them.</small>
      </div>
    </footer>
  );
}
