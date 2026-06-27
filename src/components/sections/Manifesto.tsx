import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import { manifestoContent } from "@/content/manifesto";
import styles from "./Manifesto.module.css";

export function Manifesto() {
  const { headline, body, cta } = manifestoContent;
  return (
    <section className={styles.manifesto} id="manifesto">
      <Reveal className={`container ${styles.inner}`}>
        <h2 className={styles.headline}>{headline}</h2>
        <p className={styles.body}>{body}</p>
        <Link href={cta.href} className={styles.cta} id={cta.id}>
          {cta.label} →
        </Link>
      </Reveal>
    </section>
  );
}
