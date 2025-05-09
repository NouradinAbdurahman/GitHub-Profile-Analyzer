"use client";

import { useState, useEffect } from "react";
import { processAIResponse } from "@/lib/text-formatter";
import { ReactMarkdownRenderer } from "@/components/ui/react-markdown-renderer";
import { AnimatedMarkdown } from "@/components/ui/animated-markdown";

interface AIResponseProps {
  text: string | null;
  className?: string;
  animate?: boolean;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

export default function AIResponse({
  text,
  className = "",
  animate = true,
  speed = 30,
  delay = 200,
  onComplete,
}: AIResponseProps) {
  const [processedText, setProcessedText] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (text) {
      // Reset state when text changes
      setIsReady(false);
      setIsLoading(true);

      // Process the text with a small delay to ensure clean rendering
      const timer = setTimeout(() => {
        try {
          // Process the text using our advanced text normalizer
          const processed = processAIResponse(text);
          setProcessedText(processed);
          setIsReady(true);
        } catch (error) {
          console.error("Error processing AI response:", error);
        } finally {
          setIsLoading(false);
        }
      }, 50);

      return () => clearTimeout(timer);
    } else {
      setProcessedText("");
      setIsReady(false);
      setIsLoading(false);
    }
  }, [text]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!text || !isReady) {
    return null;
  }

  if (!animate) {
    return (
      <ReactMarkdownRenderer
        markdown={processedText}
        className={className}
      />
    );
  }

  return (
    <AnimatedMarkdown
      markdown={processedText}
      className={className}
      speed={speed}
      delay={delay}
      onComplete={onComplete}
    />
  );
}
