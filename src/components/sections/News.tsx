import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import { newsItems, TAG_LABEL, formatNewsDate } from "@/content/news";
import shared from "./shared.module.css";
import styles from "./News.module.css";

export function News() {
  const latest = newsItems.slice(0, 3);
  return (
    <section className={`${shared.section} ${shared.alt}`} id="news" aria-label="Latest updates">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>Transmissions</span>
          <h2 className={shared.title}>Latest From The Signal.</h2>
          <p className={shared.body}>
            This isn&apos;t a project that launched and went quiet. Here&apos;s
            what shipped most recently.
          </p>
        </Reveal>

        <Reveal className={styles.list}>
          {latest.map((item) => (
            <article key={item.id} id={`news-${item.id}`} className={styles.item}>
              <div className={styles.meta}>
                <time className={styles.date} dateTime={item.date}>
                  {formatNewsDate(item.date)}
                </time>
                <span className={styles.tag} data-tag={item.tag}>
                  {TAG_LABEL[item.tag]}
                </span>
              </div>
              <h3 className={styles.itemTitle}>{item.title}</h3>
              <p className={styles.itemBody}>{item.body}</p>
            </article>
          ))}
        </Reveal>

        <Reveal className={styles.footer}>
          <Link href="/news" className={styles.cta} id="news-cta">
            Read all updates →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
