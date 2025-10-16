"use client";

import { motion } from "framer-motion";
import { GitBranch, GitCommit, GitMerge, Github, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg" | "xl";
  fullPage?: boolean;
  text?: string;
  className?: string;
};

export function LoadingSpinner({
  size = "md",
  fullPage = false,
  text = "Loading",
  className,
}: LoadingSpinnerProps) {
  // Size mappings
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  // Text size mappings
  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  // Container classes based on fullPage prop
  const containerClasses = fullPage
    ? "fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50"
    : "flex flex-col items-center justify-center min-h-[50vh] py-8";

  return (
    <div className={cn(containerClasses, className)}>
      <div className="relative">
        {/* Main GitHub icon */}
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-primary"
        >
          <Github className={sizeClasses[size]} />
        </motion.div>

        {/* Orbiting elements */}
        <motion.div
          className="absolute top-0 left-0 right-0 bottom-0"
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <motion.div
            className="absolute"
            style={{
              top: "0%",
              left: "50%",
              transform: "translate(-50%, -50%)"
            }}
          >
            <GitBranch className={cn("text-blue-500", sizeClasses.sm)} />
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute top-0 left-0 right-0 bottom-0"
          animate={{ rotate: -360 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <motion.div
            className="absolute"
            style={{
              top: "50%",
              right: "0%",
              transform: "translate(50%, -50%)"
            }}
          >
            <GitCommit className={cn("text-green-500", sizeClasses.sm)} />
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute top-0 left-0 right-0 bottom-0"
          animate={{ rotate: 360 }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <motion.div
            className="absolute"
            style={{
              bottom: "0%",
              left: "50%",
              transform: "translate(-50%, 50%)"
            }}
          >
            <GitMerge className={cn("text-purple-500", sizeClasses.sm)} />
          </motion.div>
        </motion.div>
      </div>

      {text && (
        <motion.p
          className={cn("mt-4 text-muted-foreground font-medium", textSizeClasses[size])}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

// Simple version without orbiting elements
export function SimpleLoadingSpinner({
  size = "md",
  fullPage = false,
  text = "Loading",
  className,
}: LoadingSpinnerProps) {
  // Size mappings
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  // Text size mappings
  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
  };

  // Container classes based on fullPage prop
  const containerClasses = fullPage
    ? "fixed inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50"
    : "flex flex-col items-center justify-center min-h-[50vh] py-8";

  return (
    <div className={cn(containerClasses, className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
        className="text-primary"
      >
        <Loader2 className={sizeClasses[size]} />
      </motion.div>

      {text && (
        <motion.p
          className={cn("mt-4 text-muted-foreground font-medium", textSizeClasses[size])}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
