"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OFFICIAL } from "@/lib/official";
import { XIcon, TelegramIcon } from "@/components/icons/SocialIcons";
import styles from "./MobileCTABar.module.css";

/** Appears after the hero scrolls out; hidden again near the final CTA. */
export function MobileCTABar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const doc = document.documentElement;
      const nearBottom = y + window.innerHeight > doc.scrollHeight - 800;
      setVisible(y > window.innerHeight * 0.8 && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[styles.bar, visible ? styles.visible : "", "no-print"].join(" ")}
      aria-hidden={!visible}
    >
      <Button href={OFFICIAL.TG_URL} size="sm" className={styles.btn}>
        <TelegramIcon size={16} /> Join TG
      </Button>
      <Button href={OFFICIAL.X_URL} variant="secondary" size="sm" className={styles.btn}>
        <XIcon size={15} /> Follow X
      </Button>
    </div>
  );
}
