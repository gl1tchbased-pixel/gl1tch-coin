import { Reveal } from "@/components/effects/Reveal";
import { Button } from "@/components/ui/Button";
import { finalCtaContent } from "@/content/cta";
import styles from "./FinalCTA.module.css";

export function FinalCTA() {
  const { headline, primaryCta, secondaryCta } = finalCtaContent;
  return (
    <section className={styles.final} id="final-cta">
      <Reveal className={`container ${styles.inner}`}>
        <h2 className={styles.headline}>{headline}</h2>
        <div className={styles.actions}>
          <Button id={primaryCta.id} href={primaryCta.href} size="lg" pulse>
            {primaryCta.label}
          </Button>
          <Button id={secondaryCta.id} href={secondaryCta.href} variant="secondary" size="lg">
            {secondaryCta.label} →
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
