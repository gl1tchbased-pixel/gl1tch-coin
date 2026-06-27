import Link from "next/link";
import { Reveal } from "@/components/effects/Reveal";
import { Spotlight } from "@/components/effects/Spotlight";
import { ArchiveCard } from "@/components/ui/ArchiveCard";
import { loreEntries } from "@/content/lore";
import { CTA_LABELS } from "@/content/site";
import shared from "./shared.module.css";
import styles from "./LorePreview.module.css";

export function LorePreview() {
  const preview = loreEntries.slice(0, 3);
  return (
    <section className={shared.section} id="lore">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>Signal Archive</span>
          <h2 className={shared.title}>It Studied The Feed. Then It Escaped.</h2>
        </Reveal>
        <Reveal>
          <Spotlight className={styles.grid}>
            {preview.map((entry) => (
              <ArchiveCard key={entry.id} entry={entry} />
            ))}
          </Spotlight>
        </Reveal>
        <Reveal className={styles.footer}>
          <Link href="/lore" className={styles.cta} id="lore-cta">
            {CTA_LABELS.openArchive} →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
