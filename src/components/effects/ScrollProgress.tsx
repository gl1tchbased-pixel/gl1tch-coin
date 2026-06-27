"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import styles from "./ScrollProgress.module.css";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  return (
    <motion.div
      className={`${styles.bar} no-print`}
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}
