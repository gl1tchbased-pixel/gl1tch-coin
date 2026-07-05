import Link from "next/link";
import styles from "./Article.module.css";

/**
 * Article — SEO-first educational page shell. Targets high-intent, non-branded search
 * ("how to spot a rug pull") to pull strangers in, teaches something genuinely useful,
 * then funnels to the free scanner + $GL1TCH. Emits Article + FAQPage JSON-LD for rich
 * results. This is GL1TCH's organic-discovery moat: no other meme coin has a real tool
 * to build a learning center around.
 */

const SITE = "https://coin-three-mu.vercel.app";

export type Section = { h: string; body: React.ReactNode };
export type Faq = { q: string; a: string };

export function Article({
  slug,
  eyebrow,
  title,
  intro,
  sections,
  faqs = [],
  ctaLine,
}: {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  sections: Section[];
  faqs?: Faq[];
  ctaLine?: string;
}) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: intro,
      author: { "@type": "Organization", name: "GL1TCH" },
      publisher: { "@type": "Organization", name: "GL1TCH" },
      mainEntityOfPage: `${SITE}/learn/${slug}`,
    },
    ...(faqs.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]
      : []),
  ];

  return (
    <main className="container" style={{ paddingBlock: "var(--space-16)", maxWidth: 820 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link href="/learn">Learn</Link> <span>/</span> <span>{eyebrow}</span>
      </nav>
      <h1 className={styles.h1}>{title}</h1>
      <p className={styles.intro}>{intro}</p>

      {/* Inline CTA — the reader came with intent; give the tool immediately. */}
      <div className={styles.toolCta}>
        <span>Want the answer for a specific token?</span>
        <Link href="/scan" className={styles.toolBtn}>Scan it free →</Link>
      </div>

      {sections.map((s) => (
        <section key={s.h} className={styles.section}>
          <h2 className={styles.h2}>{s.h}</h2>
          <div className={styles.body}>{s.body}</div>
        </section>
      ))}

      {faqs.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.h2}>FAQ</h2>
          <div className={styles.faqs}>
            {faqs.map((f) => (
              <details key={f.q} className={styles.faq}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className={styles.end}>
        <p>{ctaLine || "GL1TCH is a free, non-custodial scanner that runs all of these checks for you in seconds — on any token, any chain."}</p>
        <div className={styles.endRow}>
          <Link href="/scan" className={styles.endPrimary}>Scan a token — free</Link>
          <Link href="/radar" className={styles.endGhost}>See live rug catches</Link>
        </div>
        <p className={styles.related}>
          Related: <Link href="/learn/how-to-spot-a-rug-pull">Spot a rug pull</Link> ·{" "}
          <Link href="/learn/what-is-a-honeypot">What is a honeypot</Link> ·{" "}
          <Link href="/learn/how-to-check-if-a-token-is-safe">Check if a token is safe</Link>
        </p>
      </section>
    </main>
  );
}
