"use client";
import { motion } from "framer-motion";

export default function AnimatedIcon({ Icon, colorClass, rotate, small }: { Icon: any; colorClass: string; rotate: number; small?: boolean }) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.15, 1],
        rotate: [0, rotate, 0],
        filter: [
          'drop-shadow(0 0 16px rgba(99,102,241,0.7))',
          'drop-shadow(0 0 32px rgba(99,102,241,0.9))',
          'drop-shadow(0 0 16px rgba(99,102,241,0.7))',
        ],
      }}
      transition={{
        duration: 2.2,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut",
      }}
      className="inline-block"
    >
      <Icon className={`${small ? 'h-6 w-6' : 'h-10 w-10'} ${colorClass}`} />
    </motion.div>
  );
} 