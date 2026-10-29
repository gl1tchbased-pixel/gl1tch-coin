/**
 * Instant feedback for pages rendered on request (Quantum Core, Yield X-Ray cards, scan reports…). Without it a
 * click on such a link changed nothing on screen until the server answered, which felt like a frozen site.
 * Header and footer stay; this fills the page area for the moment it takes.
 */
export default function Loading() {
  return (
    <section className="container" style={{ paddingBlock: "var(--space-16)", minHeight: "60vh" }} aria-busy="true">
      <span className="sr-only" role="status">Loading…</span>
      <div style={{ display: "grid", gap: "var(--space-4)", maxWidth: 720, margin: "0 auto" }} aria-hidden="true">
        <span className="skeleton" style={{ width: "6em", height: "0.8em" }} />
        <span className="skeleton" style={{ width: "70%", height: "2.4em" }} />
        <span className="skeleton" style={{ width: "100%", height: "1em" }} />
        <span className="skeleton" style={{ width: "88%", height: "1em" }} />
        <span className="skeleton" style={{ width: "100%", height: "9em", marginTop: "var(--space-4)" }} />
      </div>
    </section>
  );
}
