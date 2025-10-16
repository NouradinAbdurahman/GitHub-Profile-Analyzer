/**
 * Utility to detect and handle garbage text patterns in AI responses
 */

/**
 * Checks if the text contains known garbage patterns
 * @param text The text to check
 * @returns true if the text contains garbage patterns
 */
export function containsGarbagePatterns(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  // Check for the specific "caTng" pattern
  if (text.includes('caTng') && (text.match(/caTng/g) || []).length > 3) {
    return true;
  }
  
  // Check for "TTT" pattern (common in garbage text)
  if (text.includes('TTTTTT') || text.includes('TTTTT')) {
    return true;
  }
  
  // Check for excessive repetition of any pattern
  const words = text.split(/\s+/);
  if (words.length > 20) {
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      if (word.length > 2) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
    
    // If any word appears more than 25% of the time and more than 8 times, it's likely garbage
    for (const [_, count] of Object.entries(wordCounts)) {
      if (count > 8 && count / words.length > 0.25) {
        return true;
      }
    }
  }
  
  // Check for excessive T's (common in garbage text)
  if ((text.match(/T/g) || []).length > text.length * 0.15 && text.length > 100) {
    return true;
  }
  
  // Check for excessive non-word characters
  const nonWordChars = text.replace(/[\w\s]/g, '').length;
  if (nonWordChars > text.length * 0.4 && text.length > 100) {
    return true;
  }
  
  return false;
}

/**
 * Replaces garbage text with a user-friendly error message
 * @param text The text to check and potentially replace
 * @returns The original text or an error message if garbage is detected
 */
export function handleGarbageText(text: string): string {
  if (containsGarbagePatterns(text)) {
    return "An error occurred while generating the response. Please try again.";
  }
  return text;
}
