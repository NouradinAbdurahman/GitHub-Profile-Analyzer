"use client";
import { motion, Variants, Transition } from "framer-motion";

// Define a more specific type for the transition's repeatType
type RepeatType = "loop" | "reverse" | "mirror";

export default function AnimatedIcon({
  Icon,
  colorClass,
  rotate,
  small,
  isHovered,
}: {
  Icon: any;
  colorClass: string;
  rotate: number;
  small?: boolean;
  isHovered: boolean;
}) {
  const iconVariants: Variants = {
    static: {
      scale: 1,
      rotate: 0,
      filter: 'drop-shadow(0 0 16px rgba(99,102,241,0.7))',
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    looping: {
      scale: [1, 1.15, 1],
      rotate: [0, rotate, 0],
      filter: [
        'drop-shadow(0 0 16px rgba(99,102,241,0.7))',
        'drop-shadow(0 0 32px rgba(99,102,241,0.9))',
        'drop-shadow(0 0 16px rgba(99,102,241,0.7))',
      ],
      transition: {
        duration: 2.2,
        repeat: Infinity,
        repeatType: "loop" as RepeatType, // Cast to the specific type
        ease: "easeInOut",
      },
    },
  };

  return (
    <motion.div
      variants={iconVariants}
      initial="static"
      animate={isHovered ? "looping" : "static"}
      className="inline-block"
    >
      <Icon className={`${small ? 'h-6 w-6' : 'h-10 w-10'} ${colorClass}`} />
    </motion.div>
  );
}