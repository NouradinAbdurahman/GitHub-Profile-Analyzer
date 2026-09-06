/**
 * Utility functions for environment variables
 */

/**
 * Check if the OpenRouter API key is configured
 */
export function isOpenRouterApiKeyConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

/**
 * Get the OpenRouter API key
 */
export function getOpenRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}
