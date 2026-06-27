import type { Metadata } from "next";
import Link from "next/link";
import { newsItems, TAG_LABEL, formatNewsDate } from "@/content/news";
import styles from "./news.module.css";

export const metadata: Metadata = {
  title: "Updates — GL1TCH",
  description:
    "The GL1TCH changelog — every shipped milestone, launch, listing and trust update, newest first.",
  alternates: { canonical: "/news" },
};

export default function NewsPage() {
  return (
    <section className={styles.wrap}>
      <header className={styles.header}>
        <span className="t-eyebrow">Transmissions</span>
        <h1 className="t-h2" style={{ marginTop: "var(--space-3)" }}>
          Updates &amp; Changelog
        </h1>
        <p className={styles.sub}>
          Every milestone GL1TCH has shipped — receipts, not promises. Newest
          first.
        </p>
      </header>

      <ol className={styles.timeline}>
        {newsItems.map((item) => (
          <li key={item.id} id={`news-${item.id}`} className={styles.entry}>
            <div className={styles.dot} aria-hidden="true" />
            <div className={styles.meta}>
              <time className={styles.date} dateTime={item.date}>
                {formatNewsDate(item.date)}
              </time>
              <span className={styles.tag} data-tag={item.tag}>
                {TAG_LABEL[item.tag]}
              </span>
            </div>
            <h2 className={styles.title}>{item.title}</h2>
            <p className={styles.body}>{item.body}</p>
          </li>
        ))}
      </ol>

      <div className={styles.footer}>
        <Link href="/" className={styles.back}>
          ← Back to home
        </Link>
        <Link href="/links" className={styles.back}>
          Official links &amp; contract →
        </Link>
      </div>
    </section>
  );
}
