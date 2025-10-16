/**
 * Utility functions for environment variables
 */

/**
 * Check if the DAKAEI API key is configured
 */
export function isDakaeiApiKeyConfigured(): boolean {
  return !!process.env.DAKAEI_API_KEY;
}

/**
 * Get the DAKAEI API key
 */
export function getDakaeiApiKey(): string | undefined {
  return process.env.DAKAEI_API_KEY;
}
