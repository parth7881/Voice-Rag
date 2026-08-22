import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="page-bg offline-page">
      <section className="offline-card">
        <span className="eyebrow">Connection unavailable</span>
        <h1>You’re offline.</h1>
        <p>The interface is still available, but live voice, retrieval and answer generation need a network connection.</p>
        <Link className="offline-link" href="/">Return to Goa Voice</Link>
      </section>
    </main>
  );
}
