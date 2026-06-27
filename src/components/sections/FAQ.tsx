import { Reveal } from "@/components/effects/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { faqItems } from "@/content/faq";
import shared from "./shared.module.css";
import styles from "./FAQ.module.css";

export function FAQ() {
  return (
    <section className={shared.section} id="faq">
      <div className="container">
        <Reveal className={shared.head}>
          <span className={shared.eyebrow}>FAQ</span>
          <h2 className={shared.title}>Verified Answers.</h2>
        </Reveal>
        <Reveal className={styles.list}>
          {faqItems.map((item) => (
            <Accordion key={item.id} id={item.id} title={item.question}>
              {item.answer}
            </Accordion>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
