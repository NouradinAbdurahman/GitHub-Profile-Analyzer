"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface TypewriterEffectProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

export function TypewriterEffect({
  text,
  className,
  speed = 30,
  delay = 0,
  onComplete,
}: TypewriterEffectProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset when text changes
    setDisplayText("");
    setCurrentIndex(0);
    setIsComplete(false);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [text]);

  useEffect(() => {
    if (!text) return;

    let intervalId: NodeJS.Timeout | null = null;

    // Pre-process the text into chunks for better typing effect
    // This helps with smoother animation and prevents issues with character-by-character rendering
    const chunks = prepareTextChunks(text);
    let chunkIndex = 0;

    // Initial delay before starting
    const initialTimeout = setTimeout(() => {
      // Start the typing effect using chunks instead of individual characters
      intervalId = setInterval(() => {
        if (chunkIndex < chunks.length) {
          setDisplayText(prev => prev + chunks[chunkIndex]);
          chunkIndex++;
        } else {
          if (intervalId) clearInterval(intervalId);
          setIsComplete(true);
          if (onComplete) onComplete();
        }
      }, speed);
    }, delay);

    timeoutRef.current = initialTimeout;

    return () => {
      if (intervalId) clearInterval(intervalId);
      clearTimeout(initialTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, speed, delay, onComplete]);

  /**
   * Prepares text for typewriter effect by breaking it into optimal chunks
   * This creates a more natural typing effect and prevents issues with character duplication
   */
  function prepareTextChunks(text: string): string[] {
    if (!text) return [];

    // For very short text, just return individual characters
    if (text.length < 10) {
      return text.split('');
    }

    const chunks: string[] = [];
    let currentChunk = '';
    const chars = text.split('');

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];

      // Add the current character to the chunk
      currentChunk += char;

      // Determine if we should end the current chunk
      const isEndOfWord = char === ' ' || char === '\n';
      const isPunctuation = /[.,!?;:]/.test(char);
      const isChunkLongEnough = currentChunk.length >= 3;

      if ((isEndOfWord || isPunctuation) && isChunkLongEnough) {
        chunks.push(currentChunk);
        currentChunk = '';
      } else if (i === chars.length - 1 && currentChunk) {
        // Add the last chunk if we've reached the end
        chunks.push(currentChunk);
      }
    }

    // If we ended up with no chunks (unlikely), fall back to character-by-character
    return chunks.length > 0 ? chunks : text.split('');
  }

  return (
    <div className={cn("whitespace-pre-line", className)}>
      {displayText}
      {!isComplete && <span className="typewriter-cursor" aria-hidden="true"></span>}
    </div>
  );
}
