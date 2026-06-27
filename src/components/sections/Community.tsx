import { Reveal } from "@/components/effects/Reveal";
import { Spotlight } from "@/components/effects/Spotlight";
import { Button } from "@/components/ui/Button";
import { RankCard } from "@/components/ui/RankCard";
import { communityContent } from "@/content/community";
import shared from "./shared.module.css";
import styles from "./Community.module.css";

export function Community() {
  const { headline, body, ranks, cta } = communityContent;
  return (
    <section className={`${shared.section} ${shared.alt}`} id="community">
      <div className={`container ${styles.grid}`}>
        <Reveal className={styles.intro}>
          <h2 className={shared.title}>{headline}</h2>
          <p className={shared.body}>{body}</p>
          <div className={styles.actions}>
            <Button id={cta.id} href={cta.href} size="lg">
              {cta.label}
            </Button>
            <Button id="community-ranks" href="/ranks" variant="secondary" size="lg">
              Verify Your Rank →
            </Button>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <Spotlight className={styles.ranks}>
            {ranks.map((r) => (
              <RankCard
                key={r.id}
                id={r.id}
                rank={r.rank}
                description={r.description}
                behavior={r.behavior}
                tier={r.tier}
              />
            ))}
          </Spotlight>
        </Reveal>
      </div>
    </section>
  );
}
