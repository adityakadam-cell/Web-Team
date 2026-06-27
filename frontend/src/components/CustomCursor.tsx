import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const outerX = useSpring(cursorX, { damping: 28, stiffness: 340, mass: 0.5 });
  const outerY = useSpring(cursorY, { damping: 28, stiffness: 340, mass: 0.5 });

  useEffect(() => {
    const hasHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!hasHover) return;

    setIsVisible(true);
    document.body.classList.add("custom-cursor-active");

    const move = (e: MouseEvent) => { cursorX.set(e.clientX); cursorY.set(e.clientY); };
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      setIsHovered(!!(t?.closest("a") || t?.closest("button") || t?.closest("[role=button]") || t?.closest(".interactive")));
    };
    const down = () => setIsClicking(true);
    const up   = () => setIsClicking(false);
    const hide = () => setIsVisible(false);
    const show = () => setIsVisible(true);

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    document.addEventListener("mouseleave", hide);
    document.addEventListener("mouseenter", show);

    return () => {
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      document.removeEventListener("mouseleave", hide);
      document.removeEventListener("mouseenter", show);
    };
  }, [cursorX, cursorY]);

  if (!isVisible) return null;

  return (
    <>
      {/* Outer ring */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[9999] border-2 border-white/70 mix-blend-difference"
        style={{ x: outerX, y: outerY, translateX: "-50%", translateY: "-50%" }}
        animate={{ scale: isClicking ? 0.75 : isHovered ? 1.6 : 1 }}
        transition={{ type: "tween", duration: 0.12 }}
      />
      {/* Inner dot */}
      <motion.div
        className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full pointer-events-none z-[9999] bg-white mix-blend-difference"
        style={{ x: cursorX, y: cursorY, translateX: "-50%", translateY: "-50%" }}
        animate={{ scale: isClicking ? 1.8 : isHovered ? 0.4 : 1 }}
        transition={{ type: "tween", duration: 0.1 }}
      />
    </>
  );
}
