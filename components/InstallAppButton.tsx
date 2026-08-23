"use client";

import { useEffect, useState } from "react";
import styles from "./InstallAppButton.module.css";

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
      intro: "On iPhone or iPad, install Goa Voice from Safari as a Home Screen web app.",
      steps: [
        "Open this website in Safari.",
        "Tap the Share button in Safari.",
        "Choose Add to Home Screen.",
        "Turn on Open as Web App if shown, then tap Add."
      ],
      note: "Apple does not provide the same automatic install prompt used by Chromium browsers, so this short Safari flow is required."
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
      note: "Once added, Goa Voice opens in its own app-style window."
    };
  }

  if (isAndroid) {
    return {
      title: "Install Goa Voice",
      intro: "Your browser did not expose the one-tap install prompt right now. You can still install it from the browser menu.",
      steps: [
        "Open the browser menu (usually ⋮).",
        "Choose Install app or Add to Home screen.",
        "Confirm Install.",
        "Open Goa Voice from your Home Screen like a normal app."
      ],
      note: "Install wording varies by Android browser. Chrome and Edge usually show Install app when the site is eligible."
    };
  }

  if (isChrome || isEdge) {
    return {
      title: "Install Goa Voice",
      intro: "Install Goa Voice on your computer as a standalone web app.",
      steps: [
        "Open the browser menu.",
        "Choose Install Goa Voice, Install app, or Apps → Install this site as an app.",
        "Confirm Install.",
        "Launch it from your desktop, Start menu, or app launcher."
      ],
      note: "The exact menu label can differ between Chrome and Edge versions."
    };
  }

  return {
    title: "Install Goa Voice",
    intro: "This browser does not currently expose a direct PWA install prompt.",
    steps: [
      "Open this page in current Chrome, Edge, or Safari.",
      "Use the browser's Install app, Add to Home Screen, or Add to Dock option.",
      "Confirm the installation.",
      "Launch Goa Voice from your device like an app."
    ],
    note: "Goa Voice remains fully usable as a normal website even when installation is unavailable in a particular browser."
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

  useEffect(() => {
    setInstalled(isStandalone());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setHelp(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (installed || isStandalone()) {
      setInstalled(true);
      setHelp({
        title: "Goa Voice is installed",
        intro: "This device is already running Goa Voice as an installed web app.",
        steps: ["Close this message and continue using the app."],
        note: "You can reopen Goa Voice later from your Home Screen, desktop, Start menu, Dock, or app launcher."
      });
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);

        if (choice.outcome === "accepted") {
          return;
        }
      } catch {
        // Fall through to browser-specific manual instructions.
      }
    }

    setHelp(getInstallHelp());
  }

  return (
    <>
      <button className={styles.installButton} type="button" onClick={() => void install()} aria-label="Install Goa Voice app">
        <DownloadIcon />
        <span>{installed ? "Installed" : "Install App"}</span>
      </button>

      {help ? (
        <div className={styles.overlay} role="presentation" onMouseDown={() => setHelp(null)}>
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className={styles.closeButton} type="button" onClick={() => setHelp(null)} aria-label="Close install instructions">
              ×
            </button>
            <span className={styles.kicker}>GOA VOICE APP</span>
            <h2 id="install-dialog-title">{help.title}</h2>
            <p>{help.intro}</p>
            <ol className={styles.steps}>
              {help.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <p className={styles.note}>{help.note}</p>
          </section>
        </div>
      ) : null}
    </>
  );
}
