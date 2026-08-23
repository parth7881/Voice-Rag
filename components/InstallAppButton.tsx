"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./InstallAppButton.module.css";

const ANDROID_APK_URL = "https://github.com/parth7881/Voice-Rag/releases/latest/download/GoaVoice.apk";
const WINDOWS_EXE_URL = "https://github.com/parth7881/Voice-Rag/releases/latest/download/GoaVoice-Setup-0.1.0.exe";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallHelp = {
  title: string;
  intro: string;
  steps: string[];
  note: string;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function getInstallHelp(): InstallHelp {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR|Firefox|FxiOS/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua) && !/Edg|OPR/i.test(ua);
  const isEdge = /Edg/i.test(ua);

  if (isIOS) {
    return {
      title: "Install Goa Voice",
      intro: "iPhone and iPad do not install Android APK files. Use Safari to add Goa Voice as a Home Screen web app.",
      steps: [
        "Open this website in Safari.",
        "Tap the Share button in Safari.",
        "Choose Add to Home Screen.",
        "Turn on Open as Web App if shown, then tap Add."
      ],
      note: "A separate native iOS IPA/App Store build requires Apple signing and can be added later."
    };
  }

  if (isMac && isSafari) {
    return {
      title: "Install Goa Voice",
      intro: "Safari on macOS can save this website as an app in your Dock.",
      steps: [
        "Open this website in Safari.",
        "From the menu bar, choose File.",
        "Choose Add to Dock.",
        "Confirm the app name and add it."
      ],
      note: "A separate signed macOS package can be added later if needed."
    };
  }

  if (isAndroid) {
    return {
      title: "Install Goa Voice",
      intro: "For a real Android app, use the APK download below. You can also install the PWA from your browser.",
      steps: [
        "Tap Download Android APK below.",
        "Open the downloaded GoaVoice.apk file.",
        "If Android asks, allow installs from this browser or file manager.",
        "Tap Install, then open Goa Voice from your app drawer."
      ],
      note: "The APK is built from the same production Goa Voice code path and connects to the same live backend."
    };
  }

  if (isChrome || isEdge || /Windows/i.test(ua)) {
    return {
      title: "Install Goa Voice",
      intro: "For a real Windows desktop app, download the installer below. Browser PWA installation remains available too.",
      steps: [
        "Click Download Windows EXE below.",
        "Open GoaVoice-Setup-0.1.0.exe.",
        "Complete the installer.",
        "Launch Goa Voice from the Desktop or Start menu."
      ],
      note: "The first unsigned hackathon build may trigger a Windows SmartScreen warning. Code signing can remove that warning in a production release."
    };
  }

  return {
    title: "Install Goa Voice",
    intro: "Choose a native download below, or install the PWA from a supported browser.",
    steps: [
      "Android users can download the APK.",
      "Windows users can download the EXE installer.",
      "Chrome, Edge, and Safari can also install Goa Voice as a web app.",
      "Use the build that matches your device."
    ],
    note: "Android APK and Windows EXE use the same production Goa Voice service."
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
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState<InstallHelp | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setInstalled(isStandalone());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
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
    if (deferredPrompt && !installed && !isStandalone()) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
      } catch {
        // Native/PWA download dialog below remains available.
      }
    }

    setHelp(getInstallHelp());
  }

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
          <span className={styles.kicker}>GOA VOICE NATIVE APP</span>
          <button className={styles.closeButton} type="button" onClick={() => setHelp(null)} aria-label="Close install instructions">
            ×
          </button>
        </div>

        <div className={styles.dialogBody}>
          <h2 id="install-dialog-title">{help.title}</h2>
          <p>{help.intro}</p>

          <div className={styles.nativeDownloads}>
            <a className={styles.nativeDownload} href={ANDROID_APK_URL}>
              <strong>Android</strong>
              <span>Download APK</span>
            </a>
            <a className={styles.nativeDownload} href={WINDOWS_EXE_URL}>
              <strong>Windows</strong>
              <span>Download EXE</span>
            </a>
          </div>

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

  return (
    <>
      <button className={styles.installButton} type="button" onClick={() => void install()} aria-label="Download or install Goa Voice app">
        <DownloadIcon />
        <span>{installed ? "App Options" : "Install App"}</span>
      </button>

      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
