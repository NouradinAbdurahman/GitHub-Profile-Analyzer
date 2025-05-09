/**
 * Utility functions for formatting text from AI responses
 */
import { normalizeAIResponse } from './text-normalizer';
import { handleGarbageText } from './garbage-text-detector';

/**
 * Sanitize markdown text by preserving formatting but removing unwanted symbols
 * @param text The text to sanitize
 * @returns Sanitized text with markdown formatting preserved
 */
export function sanitizeMarkdown(text: string): string {
  if (!text) return '';

  try {
    // Preserve markdown formatting for headings, bold, italic, etc.
    // We only want to clean up excessive characters and non-printable characters

    // Remove any repeated special characters (like dots, dashes, etc.)
    let sanitized = text.replace(/([^\w\s])\1{10,}/g, '$1$1$1');

    // Remove any non-printable characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // Fix common markdown formatting issues

    // Fix headings that use # without proper spacing or line breaks
    // First ensure headings have a space after the #
    sanitized = sanitized.replace(/^(#+)([^\s])/gm, '$1 $2');

    // Ensure headings have a line break before them (except at the start of the text)
    sanitized = sanitized.replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2');

    // Ensure headings have a line break after them
    sanitized = sanitized.replace(/(#{1,6}\s.+)([^\n])$/gm, '$1\n');

    // Fix hashtags that might be confused with headings (like #1, #2)
    sanitized = sanitized.replace(/(\s)(#\d+)(\s)/g, '$1\\$2$3');

    // Fix malformed bold/italic (no spaces between asterisks)
    sanitized = sanitized.replace(/(\w)\*\*(\w)/g, '$1 **$2');
    sanitized = sanitized.replace(/(\w)\*(\w)/g, '$1 *$2');

    // Fix malformed code blocks (ensure proper line breaks)
    sanitized = sanitized.replace(/```(\w+)(?!\n)/g, '```$1\n');
    sanitized = sanitized.replace(/(?<!\n)```/g, '\n```');

    // Ensure bullet points have proper spacing
    sanitized = sanitized.replace(/^(\s*)-([^\s])/gm, '$1- $2');

    // Add line breaks before bullet point lists
    sanitized = sanitized.replace(/([^\n])(\s*-\s)/g, '$1\n\n$2');

    return sanitized;
  } catch (error) {
    console.error('Error sanitizing markdown:', error);
    // Return the original text if there's an error
    return text;
  }
}

/**
 * Format text for display with proper line breaks and spacing
 * while preserving markdown formatting
 * @param text The text to format
 * @returns Formatted text with markdown preserved
 */
export function formatText(text: string): string {
  if (!text) return '';

  try {
    // Store code blocks to prevent processing markdown inside them
    const codeBlocks: string[] = [];
    let formatted = text.replace(/```([\s\S]*?)```/g, (match) => {
      const id = codeBlocks.length;
      codeBlocks.push(match);
      return `__CODE_BLOCK_${id}__`;
    });

    // Store inline code to prevent processing
    const inlineCodes: string[] = [];
    formatted = formatted.replace(/`([^`]+)`/g, (match) => {
      const id = inlineCodes.length;
      inlineCodes.push(match);
      return `__INLINE_CODE_${id}__`;
    });

    // Store headings to prevent processing
    const headings: string[] = [];
    formatted = formatted.replace(/^(#{1,6}\s.+)$/gm, (match) => {
      const id = headings.length;
      headings.push(match);
      return `__HEADING_${id}__`;
    });

    // Store bullet points to prevent processing
    const bulletPoints: string[] = [];
    formatted = formatted.replace(/^(\s*-\s.+)$/gm, (match) => {
      const id = bulletPoints.length;
      bulletPoints.push(match);
      return `__BULLET_${id}__`;
    });

    // Normalize line breaks
    formatted = formatted.replace(/\r\n/g, '\n');

    // Replace excessive line breaks with double line breaks (for markdown paragraphs)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Ensure proper spacing after periods, commas, and other punctuation
    // But avoid breaking markdown syntax
    formatted = formatted.replace(/([.!?])(?=\S)/g, (match, p1, offset, string) => {
      // Don't add space if it's part of a URL or number
      if (
        /\d$/.test(string.charAt(offset - 1)) && /^\d/.test(string.charAt(offset + 1)) ||
        /https?:\/\//.test(string.substring(Math.max(0, offset - 8), offset + 1))
      ) {
        return match;
      }
      return p1 + ' ';
    });

    formatted = formatted.replace(/,(?=\S)/g, (match, offset, string) => {
      // Don't add space if it's part of a number
      if (/\d$/.test(string.charAt(offset - 1)) && /^\d/.test(string.charAt(offset + 1))) {
        return match;
      }
      return ', ';
    });

    // Remove any trailing/leading whitespace
    formatted = formatted.trim();

    // Restore headings with proper spacing
    headings.forEach((heading, i) => {
      formatted = formatted.replace(`__HEADING_${i}__`, heading);
    });

    // Ensure headings have proper spacing around them
    formatted = formatted.replace(/([^\n])(\n#{1,6}\s)/g, '$1\n\n$2');
    formatted = formatted.replace(/(#{1,6}\s.+\n)([^#\n])/g, '$1\n$2');

    // Restore bullet points
    bulletPoints.forEach((bullet, i) => {
      formatted = formatted.replace(`__BULLET_${i}__`, bullet);
    });

    // Ensure bullet points have proper spacing
    formatted = formatted.replace(/([^\n])(\n\s*-\s)/g, '$1\n\n$2');

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
      formatted = formatted.replace(`__CODE_BLOCK_${i}__`, block);
    });

    // Restore inline code
    inlineCodes.forEach((code, i) => {
      formatted = formatted.replace(`__INLINE_CODE_${i}__`, code);
    });

    // Final cleanup - ensure proper spacing between sections
    formatted = formatted.replace(/(#{1,6}\s.+\n\n)(#{1,6}\s)/g, '$1\n$2');

    return formatted;
  } catch (error) {
    console.error('Error formatting text:', error);
    // Return the original text if there's an error
    return text;
  }
}



/**
 * Process AI response text for display
 * @param text The AI response text
 * @returns Processed text ready for display
 */
/**
 * Fix hashtag-style headings that are not properly formatted as markdown
 * For example: "# Heading" instead of "## Heading"
 */
function fixHashtagHeadings(text: string): string {
  if (!text) return '';

  // Look for patterns like "# Heading" or "#Heading" that are not at the start of a line
  // These are likely hashtags that should be converted to proper markdown headings

  // First, identify lines that start with hashtags but don't have proper spacing
  let fixed = text.replace(/^(#+)([^\s#])/gm, '$1 $2');

  // Next, look for hashtag-style headings in the middle of paragraphs
  // This regex looks for patterns like "# Heading" that are not at the start of a line
  // and are preceded by text (not a newline)
  fixed = fixed.replace(/([^\n])(#+\s+[^\n#]+)(\n|$)/g, '$1\n\n$2$3');

  // Fix numbered hashtags that might be confused with headings (like #1, #2)
  fixed = fixed.replace(/(\s)(#\d+)(\s)/g, '$1\\$2$3');

  // Fix hashtags that are part of a sentence and not meant to be headings
  // This looks for hashtags followed immediately by a word without space
  fixed = fixed.replace(/(^|\s)(#)([a-zA-Z0-9]+)(\s|$)/g, '$1\\$2$3$4');

  return fixed;
}

export function processAIResponse(text: string): string {
  if (!text) return '';

  try {
    // First check for garbage text patterns using our dedicated detector
    const cleanedText = handleGarbageText(text);
    if (cleanedText !== text) {
      return cleanedText; // Return the error message if garbage was detected
    }

    // Fix hashtag-style headings before normalization
    const hashtagFixed = fixHashtagHeadings(text);

    // Normalize the text to fix character duplication and word repetition
    // This uses our advanced TextNormalizer class
    const normalized = normalizeAIResponse(hashtagFixed);

    // Check again after normalization
    const cleanedNormalized = handleGarbageText(normalized);
    if (cleanedNormalized !== normalized) {
      return cleanedNormalized;
    }

    // Then apply standard markdown sanitization and formatting
    const sanitized = sanitizeMarkdown(normalized);
    const formatted = formatText(sanitized);

    // Final check on the formatted text
    const finalCheck = handleGarbageText(formatted);
    if (finalCheck !== formatted) {
      return finalCheck;
    }

    // Remove any trailing single characters that might appear as separate paragraphs
    let finalText = formatted.replace(/\n\s*([a-zA-Z])\s*$/g, "");

    // Remove any trailing whitespace
    finalText = finalText.trim();

    return finalText;
  } catch (error) {
    console.error('Error processing AI response:', error);
    // Return a user-friendly error message
    return "An error occurred while processing the text. Please try again.";
  }
}
