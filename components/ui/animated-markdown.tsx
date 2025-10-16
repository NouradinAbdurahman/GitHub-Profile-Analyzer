"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ReactMarkdownRenderer } from './react-markdown-renderer';

interface AnimatedMarkdownProps {
  markdown: string;
  className?: string;
  speed?: number; // Characters per frame
  delay?: number; // Initial delay in ms
  onComplete?: () => void;
  isPaused?: boolean; // Whether the animation is paused
  onPauseStateChange?: (isPaused: boolean) => void; // Callback when pause state changes
}

/**
 * A component that animates markdown text with a typewriter effect
 * and then renders it as formatted markdown
 */
const AnimatedMarkdown = React.forwardRef(({
  markdown,
  className = '',
  speed = 15,
  delay = 100,
  onComplete,
  isPaused = false,
  onPauseStateChange
}: AnimatedMarkdownProps, ref) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [internalPaused, setInternalPaused] = useState(isPaused);
  const charIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update internal pause state when prop changes
  useEffect(() => {
    setInternalPaused(isPaused);
  }, [isPaused]);

  // Reset animation when markdown changes
  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    setIsAnimating(false);
    setInternalPaused(false);
    charIndexRef.current = 0;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Start with initial delay
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(true);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [markdown, delay]);

  // Handle the typing animation
  useEffect(() => {
    if (!isAnimating || isComplete || !markdown || internalPaused) return;

    const animateText = () => {
      if (charIndexRef.current < markdown.length) {
        // Calculate how many characters to add in this frame
        const charsToAdd = Math.min(speed, markdown.length - charIndexRef.current);
        const nextChars = markdown.substring(charIndexRef.current, charIndexRef.current + charsToAdd);

        setDisplayText(prev => prev + nextChars);
        charIndexRef.current += charsToAdd;

        // Schedule next frame
        timeoutRef.current = setTimeout(animateText, 16); // ~60fps
      } else {
        setIsComplete(true);
        // Call the onComplete callback to notify parent component
        onComplete?.();
      }
    };

    timeoutRef.current = setTimeout(animateText, 16);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAnimating, isComplete, markdown, speed, onComplete, internalPaused]);

  // Function to toggle pause state
  const togglePause = () => {
    const newPausedState = !internalPaused;
    setInternalPaused(newPausedState);

    // Call the callback if provided
    if (onPauseStateChange) {
      onPauseStateChange(newPausedState);
    }

    // If unpausing and not complete, restart animation
    if (!newPausedState && !isComplete) {
      setIsAnimating(true);
    }
  };

  // Show cursor only during animation
  const cursorClass = isComplete ? '' : 'after:content-["_"] after:animate-pulse after:font-bold';

  // Pre-process the markdown to ensure proper formatting
  const processedMarkdown = React.useMemo(() => {
    if (!displayText) return '';

    // Fix common markdown formatting issues
    let processed = displayText;

    // Ensure headings have proper spacing
    processed = processed.replace(/^(#+)([^\s])/gm, '$1 $2');

    // Convert all headings to h6 (smallest possible heading) for consistent tiny size
    processed = processed.replace(/^# ([^#\n]+)$/gm, '###### $1');
    processed = processed.replace(/^## ([^#\n]+)$/gm, '###### $1');
    processed = processed.replace(/^### ([^#\n]+)$/gm, '###### $1');
    processed = processed.replace(/^#### ([^#\n]+)$/gm, '###### $1');
    processed = processed.replace(/^##### ([^#\n]+)$/gm, '###### $1');

    // Ensure bullet points have proper spacing
    processed = processed.replace(/^(\s*)-([^\s])/gm, '$1- $2');

    // Fix hashtags that might be confused with headings
    processed = processed.replace(/(\s)(#\d+)(\s)/g, '$1\\$2$3');

    // Remove any trailing single characters that might appear as separate paragraphs
    processed = processed.replace(/\n\s*([a-zA-Z])\s*$/g, "");

    // Remove any HTML-like tags that might have been included in the markdown
    processed = processed.replace(/<[^>]+>\s*$/g, "");

    // Remove any trailing "=> #" pattern that might appear in the output
    processed = processed.replace(/\s*=>\s*#\d*\s*$/g, "");

    // Remove any trailing whitespace
    processed = processed.trim();

    return processed;
  }, [displayText]);

  // Expose the togglePause function to the parent component
  React.useImperativeHandle(ref, () => ({
    togglePause,
    isPaused: internalPaused,
    isComplete
  }));

  return (
    <div className={`${className} ${cursorClass}`}>
      <ReactMarkdownRenderer markdown={processedMarkdown} />
    </div>
  );
});

AnimatedMarkdown.displayName = 'AnimatedMarkdown';

export default AnimatedMarkdown;
