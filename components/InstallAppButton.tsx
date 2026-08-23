"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./InstallAppButton.module.css";

const ANDROID_APK_URL = "https://github.com/parth7881/Voice-Rag/releases/latest/download/GoaVoice.apk";
const WINDOWS_EXE_URL = "https://github.com/parth7881/Voice-Rag/releases/latest/download/GoaVoice-Setup-0.1.0.exe";

type Platform = "android" | "windows" | "ios" | "mac" | "other";

type InstallHelp = {
  title: string;
  intro: string;
  steps: string[];
  note: string;
};

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
    intro: "Use a supported browser to install Goa Voice.",
    steps: [
      "Open this site in a current Chrome, Edge, or Safari browser.",
      "Use the browser's installation option when available.",
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

function downloadFile(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function InstallAppButton() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [help, setHelp] = useState<InstallHelp | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setMounted(true);
    setPlatform(getPlatform());
    setHidden(isNativeClient());

    // Prevent Chromium from replacing our real-APK download flow with a PWA
    // shortcut install prompt. Android website users should receive GoaVoice.apk.
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
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

  function install() {
    if (!platform) return;

    if (platform === "android") {
      downloadFile(ANDROID_APK_URL);
      return;
    }

    if (platform === "windows") {
      downloadFile(WINDOWS_EXE_URL);
      return;
    }

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

  const label = platform === "windows" ? "Download Setup" : platform === "android" ? "Download App" : "Install App";

  return (
    <>
      <button className={styles.installButton} type="button" onClick={install} aria-label={label}>
        <DownloadIcon />
        <span>{label}</span>
      </button>
      {modal ? createPortal(modal, document.body) : null}
    </>
  );
}
