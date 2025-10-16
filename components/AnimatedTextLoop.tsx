"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const texts = [
  "Beautiful charts,",
  "Live GitHub stats,",
  "Modern UI,",
  "Powered by shadcn/ui & Recharts",
];

export default function AnimatedTextLoop() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(
      () => setIndex((i) => (i + 1) % texts.length),
      1800
    );
    return () => clearTimeout(timeout);
  }, [index]);

  return (
    <div className="mb-4 text-2xl font-semibold h-8 flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4 }}
          className="block"
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
} 