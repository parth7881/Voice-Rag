"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./InstallAppButton.module.css";

const WINDOWS_EXE_URL = "https://github.com/parth7881/Voice-Rag/releases/latest/download/GoaVoice-Setup-0.1.0.exe";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Platform = "android" | "windows" | "ios" | "mac" | "other";

type InstallHelp = {
  title: string;
  intro: string;
  steps: string[];
  note: string;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isNativeClient(): boolean {
  if (typeof navigator === "undefined") return false;
  return /GoaVoiceNative\/(Android|Windows)/i.test(navigator.userAgent);
}

function getPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/Windows/i.test(ua)) return "windows";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
  return "other";
}

function getManualHelp(platform: Platform): InstallHelp {
  if (platform === "ios") {
    return {
      title: "Install Goa Voice",
      intro: "Install Goa Voice from Safari as a Home Screen app.",
      steps: [
        "Open this website in Safari.",
        "Tap the Share button.",
        "Choose Add to Home Screen.",
        "Turn on Open as Web App if shown, then tap Add."
      ],
      note: "iPhone and iPad use Apple's Home Screen installation flow."
    };
  }

  if (platform === "mac") {
    return {
      title: "Install Goa Voice",
      intro: "Safari on macOS can save Goa Voice as an app in your Dock.",
      steps: [
        "Open this website in Safari.",
        "Choose File from the menu bar.",
        "Choose Add to Dock.",
        "Confirm the app name."
      ],
      note: "Chrome can also offer its own web-app install prompt when available."
    };
  }

  return {
    title: "Install Goa Voice",
    intro: "Your browser is not exposing a one-tap app install prompt right now.",
    steps: [
      "Open this site in a current Chrome, Edge, or Safari browser.",
      "Use the browser's Install app or Add to Home Screen option.",
      "Confirm the installation."
    ],
    note: "The website remains fully usable even when browser installation is unavailable."
  };
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [help, setHelp] = useState<InstallHelp | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setMounted(true);

    const detectedPlatform = getPlatform();
    setPlatform(detectedPlatform);

    const installed = isStandalone() || isNativeClient();
    if (installed) {
      setHidden(true);
    } else {
      // Windows gets the native EXE download immediately. iOS/macOS use
      // platform-specific manual guidance. Android appears only when Chrome
      // exposes a real beforeinstallprompt event, guaranteeing Install/Cancel.
      setHidden(detectedPlatform === "android");
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      if (!isStandalone() && !isNativeClient()) setHidden(false);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setHelp(null);
      setHidden(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!help) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelp(null);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [help]);

  async function install() {
    if (!platform) return;

    if (platform === "windows") {
      const link = document.createElement("a");
      link.href = WINDOWS_EXE_URL;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (choice.outcome === "accepted") setHidden(true);
      } catch {
        // If the browser invalidates the event, wait for a future install event.
      }
      return;
    }

    // Android button is never shown without a real browser install event.
    if (platform === "android") return;

    setHelp(getManualHelp(platform));
  }

  if (!mounted || hidden || !platform) return null;

  const modal = help ? (
    <div className={styles.overlay} role="presentation" onMouseDown={() => setHelp(null)}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.dialogTopBar}>
          <span className={styles.kicker}>GOA VOICE APP</span>
          <button className={styles.closeButton} type="button" onClick={() => setHelp(null)} aria-label="Close install instructions">
            ×
          </button>
        </div>

        <div className={styles.dialogBody}>
          <h2 id="install-dialog-title">{help.title}</h2>
          <p>{help.intro}</p>
          <ol className={styles.steps}>
            {help.steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p className={styles.note}>{help.note}</p>
        </div>

        <div className={styles.dialogFooter}>
          <button className={styles.doneButton} type="button" onClick={() => setHelp(null)}>
            Close
          </button>
        </div>
      </section>
    </div>
  ) : null;

  const label = platform === "windows" ? "Download Setup" : "Install App";

  return (
    <>
      <button className={styles.installButton} type="button" onClick={() => void install()} aria-label={label}>
        <DownloadIcon />
        <span>{label}</span>
      </button>
      {modal ? createPortal(modal, document.body) : null}
    </>
  );
}
