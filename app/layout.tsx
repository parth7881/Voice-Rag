import type { Metadata, Viewport } from "next";
import Link from "next/link";
import InstallAppButton from "@/components/InstallAppButton";
import PwaBoot from "@/components/PwaBoot";
import "./globals.css";
import "./polish.css";

export const metadata: Metadata = {
  title: "Goa Voice — Multilingual RAG",
  description: "A multilingual voice-first RAG experience built for HH Goa 2026.",
  applicationName: "Goa Voice",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/app-icon.svg", type: "image/svg+xml" }],
    shortcut: "/app-icon.svg",
    apple: "/app-icon.svg"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Goa Voice"
  },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#08663c"
};

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Goa Voice home">
      <img className="brand-logo" src="/app-icon.svg" alt="" aria-hidden="true" />
      <span className="brand-copy">
        <strong>Goa Voice</strong>
        <small>Multilingual RAG</small>
      </span>
    </Link>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaBoot />
        <header className="site-header">
          <div className="shell header-inner">
            <Brand />
            <nav className="nav" aria-label="Primary navigation">
              <Link href="/" aria-current="page">Ask</Link>
            </nav>
            <div className="header-actions">
              <span className="system-ready"><i /> Systems ready</span>
              <InstallAppButton />
            </div>
          </div>
          <div className="goa-stripe" aria-hidden="true" />
        </header>
        {children}
      </body>
    </html>
  );
}
