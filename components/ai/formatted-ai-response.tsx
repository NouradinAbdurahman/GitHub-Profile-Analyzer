"use client";

import { useState, useEffect } from "react";
import { parseToHtml, sanitizeHtml } from "@/lib/html-parser";
import { processAIResponse } from "@/lib/text-formatter";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";

interface FormattedAIResponseProps {
  text: string | null;
  className?: string;
  animate?: boolean;
  speed?: number;
  delay?: number;
}

/**
 * A component that formats AI responses with proper styling
 * No external dependencies required
 */
export default function FormattedAIResponse({
  text,
  className = "",
  animate = true,
  speed = 30,
  delay = 200,
}: FormattedAIResponseProps) {
  const [processedText, setProcessedText] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (text) {
      // Reset state when text changes
      setIsReady(false);

      // Process the text with a small delay to ensure clean rendering
      const timer = setTimeout(() => {
        // Process the text using our advanced text normalizer
        const processed = processAIResponse(text);
        setProcessedText(processed);
        
        // Convert to HTML
        const html = parseToHtml(processed);
        const sanitized = sanitizeHtml(html);
        setHtmlContent(sanitized);
        
        setIsReady(true);
      }, 50);

      return () => clearTimeout(timer);
    } else {
      setProcessedText("");
      setHtmlContent("");
      setIsReady(false);
    }
  }, [text]);

  if (!text || !isReady) {
    return null;
  }

  if (!animate) {
    return (
      <div 
        className={`ai-response ${className}`}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  return (
    <div className="relative">
      {/* For animated text, we'll use TypewriterEffect */}
      <TypewriterEffect
        text={processedText}
        className={`text-gray-200 ${className}`}
        speed={speed}
        delay={delay}
      />
    </div>
  );
}
