"use client";

import { ArrowUpRight, Layers2, Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const links = [
  { href: "/", label: "Studio" },
  { href: "/batch", label: "Batch" },
  { href: "/api", label: "API" },
  { href: "/self-host", label: "Self-host" },
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
          <Link className="header-cta" href="/#workspace">
            Start editing <ArrowUpRight size={16} />
          </Link>
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
