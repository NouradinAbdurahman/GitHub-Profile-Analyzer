/**
 * Server-side text processing utilities
 * These functions run on the server to clean up AI responses before sending to the client
 */

/**
 * Detects if text has character duplication issues
 * @param text The text to check
 * @returns true if the text has character duplication issues
 */
export function hasCharacterDuplicationIssues(text: string): boolean {
  if (!text) return false;

  // Count consecutive duplicate characters
  const chars = text.split('');
  let duplicateCount = 0;

  for (let i = 0; i < chars.length - 1; i++) {
    if (chars[i] === chars[i + 1] && !/[\s.,!?;:]/.test(chars[i])) {
      duplicateCount++;
    }
  }

  // If more than 25% of characters are duplicated, it's likely an issue
  return duplicateCount / chars.length > 0.25;
}

/**
 * Detects if text has word repetition issues
 * @param text The text to check
 * @returns true if the text has word repetition issues
 */
export function hasWordRepetitionIssues(text: string): boolean {
  if (!text) return false;

  const words = text.split(/\s+/);
  let repetitionCount = 0;

  for (let i = 0; i < words.length - 1; i++) {
    if (words[i] && words[i] === words[i + 1]) {
      repetitionCount++;
    }
  }

  // If more than 15% of words are repeated, it's likely an issue
  return repetitionCount / words.length > 0.15;
}

/**
 * Fixes character duplication issues in text
 * @param text The text to fix
 * @returns Fixed text
 */
export function fixCharacterDuplication(text: string): string {
  if (!text) return '';

  // Fix consistent character duplication (like "TThhiiss")
  const words = text.split(/\s+/);
  const fixedWords = words.map(word => {
    // For words with consistent duplication pattern
    if (word.length >= 4 && word.length % 2 === 0) {
      let isDuplicated = true;
      for (let i = 0; i < word.length; i += 2) {
        if (word[i] !== word[i + 1]) {
          isDuplicated = false;
          break;
        }
      }

      if (isDuplicated) {
        return word.split('').filter((_, i) => i % 2 === 0).join('');
      }
    }
    return word;
  });

  return fixedWords.join(' ');
}

/**
 * Fixes word repetition issues in text
 * @param text The text to fix
 * @returns Fixed text
 */
export function fixWordRepetition(text: string): string {
  if (!text) return '';

  const words = text.split(/\s+/);
  const fixedWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    // Skip this word if it's the same as the previous one
    if (i > 0 && words[i] === words[i - 1]) {
      continue;
    }
    fixedWords.push(words[i]);
  }

  return fixedWords.join(' ');
}

/**
 * Pre-processes AI response text on the server side while preserving markdown formatting
 * @param text The text to process
 * @returns Processed text with markdown formatting preserved
 */
export function preprocessAIResponse(text: string): string {
  if (!text) return '';

  try {
    let processed = text;

    // Extract and protect markdown elements
    const markdownElements: Record<string, string> = {};

    // Extract headings
    processed = processed.replace(/^(#{1,6})\s+(.+)$/gm, (match) => {
      const placeholder = `__MD_HEADING_${Object.keys(markdownElements).length}__`;
      markdownElements[placeholder] = match;
      return placeholder;
    });

    // Extract code blocks
    processed = processed.replace(/```[\s\S]*?```/g, (match) => {
      const placeholder = `__MD_CODE_${Object.keys(markdownElements).length}__`;
      markdownElements[placeholder] = match;
      return placeholder;
    });

    // Extract inline code
    processed = processed.replace(/`([^`]+)`/g, (match) => {
      const placeholder = `__MD_INLINE_${Object.keys(markdownElements).length}__`;
      markdownElements[placeholder] = match;
      return placeholder;
    });

    // Extract bold and italic
    processed = processed.replace(/(\*\*|\*)(.*?)(\*\*|\*)/g, (match) => {
      const placeholder = `__MD_FORMAT_${Object.keys(markdownElements).length}__`;
      markdownElements[placeholder] = match;
      return placeholder;
    });

    // Check for and fix character duplication
    if (hasCharacterDuplicationIssues(processed)) {
      processed = fixCharacterDuplication(processed);
    }

    // Check for and fix word repetition
    if (hasWordRepetitionIssues(processed)) {
      processed = fixWordRepetition(processed);
    }

    // Restore markdown elements
    for (const [placeholder, original] of Object.entries(markdownElements)) {
      processed = processed.replace(placeholder, original);
    }

    return processed;
  } catch (error) {
    console.error('Error preprocessing AI response:', error);
    return text;
  }
}
