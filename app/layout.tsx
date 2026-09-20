import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "BgGone — Background Remover", template: "%s | BgGone" },
  description:
    "Remove image backgrounds, refine edges, and export full-resolution PNG or WebP files. Self-hostable background removal studio.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "BgGone",
    description: "Clean cuts. Full control. Background removal for real work.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink">
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
