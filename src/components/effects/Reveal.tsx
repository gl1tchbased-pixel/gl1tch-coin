"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

interface RevealProps {
  as?: "div" | "section" | "li";
  className?: string;
  delay?: number;
  children: React.ReactNode;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({
  as = "div",
  className = "",
  delay = 0,
  children,
}: RevealProps) {
  const reduced = useReducedMotion();

  const variants: Variants = {
    hidden: reduced
      ? { opacity: 0 }
      : { opacity: 0, y: 24, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.8, ease: EASE, delay: delay / 1000 },
    },
  };

  const MotionTag =
    as === "section" ? motion.section : as === "li" ? motion.li : motion.div;

  return (
    <MotionTag
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </MotionTag>
  );
}
