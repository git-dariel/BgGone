"use client";

import { Layers2, Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { GITHUB_REPO_URL } from "@/lib/config";

const links = [
  { href: "/", label: "Studio" },
  { href: "/batch", label: "Batch" },
  { href: "/contribute", label: "Contribute" },
];
const subscribeTheme = (callback: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("bggone:theme", callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("bggone:theme", callback);
    media.removeEventListener("change", callback);
  };
};
const getTheme = () => {
  const saved = window.localStorage.getItem("bggone:theme") ?? window.localStorage.getItem("removebg:theme");
  return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const dark = useSyncExternalStore(subscribeTheme, getTheme, () => false);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    window.localStorage.setItem("bggone:theme", next ? "dark" : "light");
    window.dispatchEvent(new Event("bggone:theme"));
  };
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="BgGone home">
          <span className="brand-mark">
            <Layers2 size={20} strokeWidth={2.6} />
          </span>
          <span>
            Bg<span className="brand-bold">Gone</span>
            <span className="brand-period">.</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link className={pathname === link.href ? "nav-link active" : "nav-link"} href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? "Use light theme" : "Use dark theme"}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <a
            className="header-github"
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View BgGone on GitHub"
          >
            <GithubIcon />
          </a>
          <button
            className="icon-button menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              onClick={() => setMenuOpen(false)}
              className={pathname === link.href ? "active" : ""}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

function GithubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.16 1.18a10.97 10.97 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.38-5.29 5.67.42.36.79 1.07.79 2.16v3.2c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}
