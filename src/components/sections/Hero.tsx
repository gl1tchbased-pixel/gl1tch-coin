import { Button } from "@/components/ui/Button";
import { GlitchText } from "@/components/effects/GlitchText";
import { SignalField } from "@/components/effects/SignalField";
import { HeroPriceChip } from "./HeroPriceChip";
import { heroContent } from "@/content/hero";
import styles from "./Hero.module.css";

export function Hero() {
  const { eyebrow, headline, subhead, microcopy, primaryCta, secondaryCta } =
    heroContent;
  const words = headline.split(" ");

  return (
    <section className={styles.hero} id="hero">
      <SignalField />
      <div className={`container ${styles.grid}`}>
        <div className={styles.content}>
          <GlitchText text={eyebrow} trigger="load" className={styles.eyebrow} />
          <HeroPriceChip />
          <h1 className={styles.headline}>
            {words.map((word, i) => (
              <span
                key={i}
                className={styles.word}
                style={{ animationDelay: `${0.15 * i + 0.2}s` }}
              >
                {word}
              </span>
            ))}
          </h1>
          <p className={styles.subhead}>{subhead}</p>
          <div className={styles.actions}>
            <Button id={primaryCta.id} href={primaryCta.href} size="lg" pulse>
              {primaryCta.label}
            </Button>
            <Button id={secondaryCta.id} href={secondaryCta.href} variant="ghost" size="lg">
              {secondaryCta.label} →
            </Button>
          </div>
          <p className={styles.microcopy}>{microcopy}</p>
        </div>

        <div className={styles.visual} aria-hidden="true">
          <span className={styles.ring} />
          <span className={styles.ring} />
          <span className={styles.ring} />
          <span className={styles.core} />
        </div>
      </div>
    </section>
  );
}
