"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface ReactMarkdownRendererProps {
  markdown: string;
  className?: string;
}

/**
 * A markdown renderer component that uses react-markdown and remark-gfm
 * for enhanced markdown support including tables, strikethrough, etc.
 */
export function ReactMarkdownRenderer({ markdown, className }: ReactMarkdownRendererProps) {
  // Preprocess markdown to remove any problematic patterns
  const cleanMarkdown = React.useMemo(() => {
    if (!markdown) return '';

    // Remove any trailing HTML-like tags
    let cleaned = markdown.replace(/<[^>]+>\s*$/g, "");

    // Remove any trailing "=> #" pattern
    cleaned = cleaned.replace(/\s*=>\s*#\d*\s*$/g, "");

    // Remove the specific pattern from the screenshot
    cleaned = cleaned.replace(/<p class="my-2 text-xs leading-relaxed">[^<]*<\/p>\s*=>\s*#\d*\s*$/g, "");

    // Remove any trailing single characters
    cleaned = cleaned.replace(/\n\s*([a-zA-Z0-9]{1,3})\s*$/g, "");

    // Remove any trailing whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }, [markdown]);

  return (
    <div className={cn("ai-response prose prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize heading rendering - using much smaller sizes
          // Make all headings extremely small - almost the same as normal text
          h1: ({ node, ...props }) => <span className="block text-xs font-semibold mt-3 mb-1 text-white" {...props} />,
          h2: ({ node, ...props }) => <span className="block text-xs font-semibold mt-2 mb-1 text-blue-300" {...props} />,
          h3: ({ node, ...props }) => <span className="block text-xs font-semibold mt-2 mb-1 text-green-300" {...props} />,
          h4: ({ node, ...props }) => <span className="block text-xs font-medium mt-2 mb-1 text-yellow-300" {...props} />,
          h5: ({ node, ...props }) => <span className="block text-xs font-medium mt-2 mb-1 text-blue-200" {...props} />,
          h6: ({ node, ...props }) => <span className="block text-xs font-normal mt-1 mb-1 text-gray-300" {...props} />,

          // Customize paragraph rendering - make it small to match headings
          p: ({ node, ...props }) => <p className="my-2 text-xs leading-relaxed" {...props} />,

          // Customize emphasis and strong
          em: ({ node, ...props }) => <em className="text-blue-200 italic" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-yellow-200" {...props} />,

          // Customize list rendering - make it small to match headings and paragraphs
          ul: ({ node, ...props }) => <ul className="list-disc ml-5 my-2 space-y-1 text-xs" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal ml-5 my-2 space-y-1 text-xs" {...props} />,
          li: ({ node, ...props }) => <li className="ml-1 mb-1 pl-1 text-xs" {...props} />,

          // Customize code block rendering
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className="bg-gray-800/50 p-2 rounded-md my-2 overflow-x-auto border border-gray-700 text-xs">
                <code className={cn(match && `language-${match[1]}`, "text-xs font-mono")} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-gray-800/50 px-1 py-0.5 rounded-md text-xs font-mono text-pink-300" {...props}>
                {children}
              </code>
            );
          },

          // Customize link rendering - make it small to match other text
          a: ({ node, ...props }) => (
            <a
              className="text-blue-400 hover:underline hover:text-blue-300 transition-colors text-xs"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),

          // Customize blockquote rendering - make it small to match other text
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-500 pl-3 italic text-gray-300 my-2 bg-gray-800/30 py-1 pr-2 rounded-r text-xs"
              {...props}
            />
          ),

          // Customize horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-gray-700" {...props} />
          ),

          // Customize table rendering - make it small to match other text
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-2 rounded-md border border-gray-700">
              <table className="min-w-full border-collapse text-xs" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-800/70 text-xs" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-700 text-xs" {...props} />,
          tr: ({ node, ...props }) => <tr className="hover:bg-gray-800/50 transition-colors text-xs" {...props} />,
          th: ({ node, ...props }) => (
            <th className="px-2 py-1 text-left text-xs font-semibold text-blue-200 border-b border-gray-700" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-2 py-1 text-xs border-gray-800/50" {...props} />
          ),
        }}
      >
        {cleanMarkdown}
      </ReactMarkdown>
    </div>
  );
}
