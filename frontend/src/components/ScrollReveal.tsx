import { ReactNode } from "react";
import { motion } from "motion/react";

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  scale?: boolean;
}

export default function ScrollReveal({
  children, className = "", delay = 0, duration = 0.65,
  direction = "up", scale = false,
}: Props) {
  const offset = { up:{y:38,x:0}, down:{y:-38,x:0}, left:{y:0,x:38}, right:{y:0,x:-38}, none:{y:0,x:0} }[direction];
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: offset.y, x: offset.x, scale: scale ? 0.94 : 1 }}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration, delay, ease: [0.21, 1.02, 0.43, 1.01] }}
    >
      {children}
    </motion.div>
  );
}
