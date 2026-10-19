import { Reveal } from "@/components/effects/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { faqItems } from "@/content/faq";
import shared from "./shared.module.css";
import styles from "./FAQ.module.css";

// What a first-time visitor asks before buying; the rest stay one click away, still on the page.
const FIRST = ["faq-what", "faq-safe", "faq-tax", "faq-team", "faq-utility", "faq-buy"];

export function FAQ() {
  const first = FIRST.map((id) => faqItems.find((f) => f.id === id)).filter((f) => f !== undefined);
  const rest = faqItems.filter((f) => !FIRST.includes(f.id));
  return (
    <section className={shared.section} id="faq">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>FAQ</span>
          <h2 className={shared.title}>Verified Answers.</h2>
        </Reveal>
        <Reveal className={styles.list}>
          {first.map((item) => (
            <Accordion key={item.id} id={item.id} title={item.question}>
              {item.answer}
            </Accordion>
          ))}
          {rest.length > 0 && (
            <details className={styles.more}>
              <summary>{rest.length} more answers</summary>
              {rest.map((item) => (
                <Accordion key={item.id} id={item.id} title={item.question}>
                  {item.answer}
                </Accordion>
              ))}
            </details>
          )}
        </Reveal>
      </div>
    </section>
  );
}
