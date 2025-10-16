"use client";

import { motion } from "framer-motion";
import { BarChart3, GitCompare, ArrowLeftRight, Scale } from "lucide-react";

export function AnimatedComparisonIcon() {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Background circle with glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.7, 0.9, 0.7],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />

      {/* Main comparison icon */}
      <motion.div
        className="absolute"
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      >
        <GitCompare className="h-12 w-12 text-primary" />
      </motion.div>

      {/* Orbiting bar chart */}
      <motion.div
        className="absolute"
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <motion.div
          className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: 0.5,
          }}
        >
          <BarChart3 className="h-6 w-6 text-blue-500" />
        </motion.div>
      </motion.div>

      {/* Orbiting arrow */}
      <motion.div
        className="absolute"
        animate={{
          rotate: -360,
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <motion.div
          className="absolute top-1/2 -right-1 transform translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        >
          <ArrowLeftRight className="h-6 w-6 text-purple-500" />
        </motion.div>
      </motion.div>

      {/* Orbiting scale */}
      <motion.div
        className="absolute"
        animate={{
          rotate: 180,
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <motion.div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: 1,
          }}
        >
          <Scale className="h-6 w-6 text-green-500" />
        </motion.div>
      </motion.div>
    </div>
  );
}
