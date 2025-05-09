/**
 * Simple HTML parser for converting markdown-like syntax to HTML
 * No external dependencies required
 */

/**
 * Convert markdown-like text to HTML
 * @param text The text to convert
 * @returns HTML string
 */
export function parseToHtml(text: string): string {
  if (!text) return '';

  // Store code blocks to prevent processing markdown inside them
  const codeBlocks: string[] = [];
  text = text.replace(/```([\s\S]*?)```/g, (match) => {
    const id = codeBlocks.length;
    codeBlocks.push(match);
    return `__CODE_BLOCK_${id}__`;
  });

  // Process headings
  text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Process bold and italic
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Process lists
  text = text.replace(/^\s*-\s*(.*$)/gm, '<li>$1</li>');
  let hasUl = text.includes('<li>');
  if (hasUl) {
    text = text.replace(/<li>(.+)<\/li>/g, (match) => {
      return match;
    });
    text = text.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    // Fix nested lists
    text = text.replace(/<\/ul>\s*<ul>/g, '');
  }

  // Process numbered lists
  text = text.replace(/^\s*\d+\.\s*(.*$)/gm, '<li>$1</li>');
  let hasOl = text.match(/^\d+\.\s/m);
  if (hasOl) {
    text = text.replace(/(<li>.*<\/li>)/g, '<ol>$1</ol>');
    // Fix nested lists
    text = text.replace(/<\/ol>\s*<ol>/g, '');
  }

  // Process links
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Process inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    const code = block.replace(/```([\s\S]*?)```/g, (match, content) => {
      // Remove the first line if it's just a language identifier
      const lines = content.split('\n');
      const codeContent = lines.length > 1 && lines[0].trim().match(/^[a-zA-Z0-9]+$/) 
        ? lines.slice(1).join('\n') 
        : content;
      return `<pre><code>${codeContent}</code></pre>`;
    });
    text = text.replace(`__CODE_BLOCK_${i}__`, code);
  });

  // Process paragraphs (any line that doesn't start with a special character)
  text = text.replace(/^(?!<[a-z])(.*$)/gm, (match) => {
    if (match.trim() === '') return '';
    return `<p>${match}</p>`;
  });

  // Clean up empty paragraphs
  text = text.replace(/<p><\/p>/g, '');

  return text;
}

/**
 * Sanitize HTML to prevent XSS attacks
 * @param html The HTML to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string): string {
  // This is a very basic sanitizer
  // In a production environment, use a proper sanitizer library
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/javascript:/g, '');
}
