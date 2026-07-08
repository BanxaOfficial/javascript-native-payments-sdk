/**
 * HTTP Header Utilities
 */

/**
 * Create standard headers for Banxa API requests.
 */
export function createBanxaHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };
}
