import { Reveal } from "@/components/effects/Reveal";
import { TimelineCard } from "@/components/ui/TimelineCard";
import { roadmapPhases } from "@/content/roadmap";
import shared from "./shared.module.css";
import styles from "./Roadmap.module.css";

export function Roadmap() {
  return (
    <section className={shared.section} id="roadmap">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>Roadmap</span>
          <h2 className={shared.title}>Build The Signal. Scale The Network.</h2>
        </Reveal>
        <Reveal className={styles.timeline}>
          {roadmapPhases.map((p) => (
            <TimelineCard
              key={p.phase}
              id={`phase-${p.phase}`}
              phase={p.phase}
              title={p.title}
              items={p.items}
              status={p.status}
            />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
