import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <nav className="footer-legal" aria-label="Legal navigation">
          <span>© 2026 BgGone</span>
          <span aria-hidden="true"> · </span>
          <Link href="/privacy">Privacy Policy</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/terms">Terms of Use</Link>
        </nav>
      </div>
    </footer>
  );
}
