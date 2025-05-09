import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  markdown: string;
  className?: string;
}

/**
 * A simple markdown renderer component that converts markdown to HTML
 */
export function MarkdownRenderer({ markdown, className }: MarkdownRendererProps) {
  // Parse the markdown into HTML
  const html = parseMarkdown(markdown);

  return (
    <div 
      className={cn("markdown-content", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Parse markdown text into HTML
 * @param markdown The markdown text to parse
 * @returns HTML string
 */
function parseMarkdown(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Handle headings (## Heading)
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-5 mb-3">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>');
  
  // Handle bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
  
  // Handle italic (*text*)
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  
  // Handle links ([text](url))
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Handle code blocks (```code```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-2 rounded my-2 overflow-x-auto"><code>$1</code></pre>');
  
  // Handle inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');
  
  // Handle unordered lists
  html = html.replace(/^\s*-\s*(.*$)/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/<\/li>\n<li/g, '</li><li');
  html = html.replace(/(<li.*<\/li>)/g, '<ul class="list-disc ml-5 my-2">$1</ul>');
  
  // Handle ordered lists
  html = html.replace(/^\s*\d+\.\s*(.*$)/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/<\/li>\n<li/g, '</li><li');
  html = html.replace(/(<li.*<\/li>)/g, '<ol class="list-decimal ml-5 my-2">$1</ol>');
  
  // Handle paragraphs
  html = html.replace(/^(?!<[a-z])(.*$)/gm, '<p class="my-2">$1</p>');
  html = html.replace(/<p><\/p>/g, '');
  
  // Handle line breaks
  html = html.replace(/\n/g, '<br />');
  
  return html;
}
