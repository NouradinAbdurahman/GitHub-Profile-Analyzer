/**
 * Advanced text normalization utilities for handling AI response text
 * This uses statistical analysis and pattern detection to fix text issues
 */

/**
 * TextNormalizer class provides advanced methods to detect and fix
 * various text issues like character duplication and word repetition
 */
export class TextNormalizer {
  private text: string;
  private normalizedText: string;
  private readonly commonDoubleLetters = new Set([
    'ee', 'oo', 'tt', 'ff', 'ss', 'll', 'mm', 'nn', 'pp', 'cc', 'rr', 'dd', 'gg'
  ]);

  constructor(text: string) {
    this.text = text || '';
    this.normalizedText = this.text;
  }

  /**
   * Analyzes the text to detect if it has character duplication issues
   * @returns true if the text likely has character duplication issues
   */
  public hasCharacterDuplicationIssues(): boolean {
    // If more than 30% of consecutive character pairs are duplicates, it's likely an issue
    const chars = this.text.split('');
    let duplicateCount = 0;

    for (let i = 0; i < chars.length - 1; i++) {
      if (chars[i] === chars[i + 1] && !/[\s.,!?;:]/.test(chars[i])) {
        duplicateCount++;
      }
    }

    const duplicationRate = duplicateCount / (chars.length - 1);
    return duplicationRate > 0.3; // Threshold for detecting systematic duplication
  }

  /**
   * Analyzes the text to detect if it has word repetition issues
   * @returns true if the text likely has word repetition issues
   */
  public hasWordRepetitionIssues(): boolean {
    const words = this.text.split(/\s+/);
    let repetitionCount = 0;

    for (let i = 0; i < words.length - 1; i++) {
      if (words[i] && words[i] === words[i + 1]) {
        repetitionCount++;
      }
    }

    const repetitionRate = repetitionCount / (words.length - 1);
    return repetitionRate > 0.2; // Threshold for detecting systematic word repetition
  }

  /**
   * Fixes character duplication issues by analyzing patterns
   * @returns this (for method chaining)
   */
  public fixCharacterDuplication(): TextNormalizer {
    if (!this.hasCharacterDuplicationIssues()) {
      return this;
    }

    // Check if every character is duplicated (like "TThhiiss")
    if (this.hasConsistentCharacterDuplication()) {
      this.normalizedText = this.fixConsistentDuplication();
      return this;
    }

    // Handle more complex duplication patterns
    const words = this.normalizedText.split(/\s+/);
    const fixedWords = words.map(word => this.fixDuplicatedWord(word));
    this.normalizedText = fixedWords.join(' ');

    return this;
  }

  /**
   * Checks if the text has a consistent pattern of character duplication
   * (every character is duplicated)
   */
  private hasConsistentCharacterDuplication(): boolean {
    const words = this.text.split(/\s+/);
    let consistentDuplicationCount = 0;

    for (const word of words) {
      if (word.length >= 4 && word.length % 2 === 0) {
        let isDuplicated = true;
        for (let i = 0; i < word.length; i += 2) {
          if (word[i] !== word[i + 1]) {
            isDuplicated = false;
            break;
          }
        }
        if (isDuplicated) {
          consistentDuplicationCount++;
        }
      }
    }

    return consistentDuplicationCount / words.length > 0.5;
  }

  /**
   * Fixes text where every character is duplicated
   */
  private fixConsistentDuplication(): string {
    const words = this.text.split(/\s+/);
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
   * Fixes a single word with duplicated characters
   */
  private fixDuplicatedWord(word: string): string {
    if (word.length < 3) return word;

    const chars = word.split('');
    const result: string[] = [chars[0]];

    for (let i = 1; i < chars.length; i++) {
      const current = chars[i];
      const prev = chars[i - 1];

      // Skip if this is a duplicated character, unless it's a common double letter
      if (current === prev) {
        const pair = prev + current;
        if (this.commonDoubleLetters.has(pair.toLowerCase())) {
          result.push(current);
        }
      } else {
        result.push(current);
      }
    }

    return result.join('');
  }

  /**
   * Fixes word repetition issues
   * @returns this (for method chaining)
   */
  public fixWordRepetition(): TextNormalizer {
    if (!this.hasWordRepetitionIssues()) {
      return this;
    }

    const words = this.normalizedText.split(/\s+/);
    const fixedWords: string[] = [];

    for (let i = 0; i < words.length; i++) {
      // Skip this word if it's the same as the previous one
      if (i > 0 && words[i] === words[i - 1]) {
        continue;
      }
      fixedWords.push(words[i]);
    }

    this.normalizedText = fixedWords.join(' ');
    return this;
  }

  /**
   * Applies all fixes to the text
   * @returns normalized text
   */
  public normalize(): string {
    return this
      .fixCharacterDuplication()
      .fixWordRepetition()
      .getNormalizedText();
  }

  /**
   * Gets the normalized text after all applied fixes
   * @returns normalized text
   */
  public getNormalizedText(): string {
    return this.normalizedText;
  }
}

/**
 * Detects and fixes specific repetitive patterns like "caTng"
 * @param text The text to fix
 * @returns Text with repetitive patterns fixed
 */
function fixRepetitivePatterns(text: string): string {
  // Fix the specific "caTng" pattern we're seeing
  if (text.includes('caTng') && (text.match(/caTng/g) || []).length > 5) {
    // If we have many occurrences of this pattern, it's likely garbage text
    return "An error occurred while generating the response. Please try again.";
  }

  // Check for other repetitive patterns (more than 50% of the text is the same word/pattern)
  const words = text.split(/\s+/);
  const wordCounts: Record<string, number> = {};

  words.forEach(word => {
    if (word.length > 2) { // Only count words with 3+ characters
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });

  // Find the most frequent word
  let mostFrequentWord = '';
  let highestCount = 0;

  Object.entries(wordCounts).forEach(([word, count]) => {
    if (count > highestCount) {
      mostFrequentWord = word;
      highestCount = count;
    }
  });

  // If a single word/pattern makes up more than 30% of the text and appears more than 10 times,
  // it's likely garbage text
  if (highestCount > 10 && highestCount / words.length > 0.3) {
    return "An error occurred while generating the response. Please try again.";
  }

  return text;
}

/**
 * Normalizes AI response text by fixing character duplication and word repetition issues
 * while preserving markdown formatting
 * @param text The text to normalize
 * @returns Normalized text with markdown formatting preserved
 */
export function normalizeAIResponse(text: string): string {
  if (!text) return '';

  try {
    // Check for repetitive patterns first
    const patternFixed = fixRepetitivePatterns(text);
    if (patternFixed !== text) {
      return patternFixed;
    }

    // First, identify and protect markdown elements
    const markdownElements = extractMarkdownElements(text);

    // Normalize the text
    const normalizer = new TextNormalizer(text);
    let normalized = normalizer.normalize();

    // Restore markdown elements
    normalized = restoreMarkdownElements(normalized, markdownElements);

    // Final check for any remaining repetitive patterns
    return fixRepetitivePatterns(normalized);
  } catch (error) {
    console.error('Error normalizing AI response:', error);
    return "An error occurred while processing the text. Please try again.";
  }
}

/**
 * Extract markdown elements from text to protect them during normalization
 * @param text The text containing markdown
 * @returns Object with extracted elements and their placeholders
 */
function extractMarkdownElements(text: string): Record<string, string> {
  const elements: Record<string, string> = {};

  // Extract headings
  text = text.replace(/^(#{1,6})\s+(.+)$/gm, (match, level, content) => {
    const placeholder = `__HEADING_${Object.keys(elements).length}__`;
    elements[placeholder] = match;
    return placeholder;
  });

  // Extract code blocks
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    const placeholder = `__CODE_BLOCK_${Object.keys(elements).length}__`;
    elements[placeholder] = match;
    return placeholder;
  });

  // Extract inline code
  text = text.replace(/`([^`]+)`/g, (match) => {
    const placeholder = `__INLINE_CODE_${Object.keys(elements).length}__`;
    elements[placeholder] = match;
    return placeholder;
  });

  // Extract bold text
  text = text.replace(/\*\*(.*?)\*\*/g, (match) => {
    const placeholder = `__BOLD_${Object.keys(elements).length}__`;
    elements[placeholder] = match;
    return placeholder;
  });

  // Extract italic text
  text = text.replace(/\*(.*?)\*/g, (match) => {
    const placeholder = `__ITALIC_${Object.keys(elements).length}__`;
    elements[placeholder] = match;
    return placeholder;
  });

  return elements;
}

/**
 * Restore markdown elements after normalization
 * @param text The normalized text with placeholders
 * @param elements The extracted markdown elements
 * @returns Text with markdown elements restored
 */
function restoreMarkdownElements(text: string, elements: Record<string, string>): string {
  let result = text;

  // Restore all placeholders with their original markdown
  for (const [placeholder, original] of Object.entries(elements)) {
    result = result.replace(placeholder, original);
  }

  return result;
}

/**
 * Strips markdown symbols (bold, italic, code, strikethrough) from text for a cleaner look
 * @param text The text to clean
 * @returns Text without markdown symbols
 */
export function stripMarkdownSymbols(text: string): string {
  if (!text) return '';
  
  // Format section headings with numbers (like 1., 2., ###) to be bold and add spacing
  let formattedText = text
    // Format numbered points (1., 2., etc.) but keep the numbers
    .replace(/^(\d+\.)\s*(.*?)$/gm, '<b>$1 $2</b>')
    // Format markdown headings (###, ##, #) to be bold with spacing
    .replace(/^#+\s+(.*?)$/gm, '<b>$1</b>')
    // Add spacing between sections (after bold headings)
    .replace(/<\/b>\n/g, '</b>\n\n')
    // Preserve list items but remove dash/asterisk markers
    .replace(/^[-*]\s+(.*?)$/gm, '• $1')
    
    // Strip other markdown symbols
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/__(.*?)__/g, '$1') // underline
    .replace(/_(.*?)_/g, '$1') // underline/italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // markdown links
    
    // Clean up excessive newlines
    .replace(/\n{3,}/g, '\n\n') // collapse multiple newlines to max 2
    .trim();
  
  return formattedText;
}
