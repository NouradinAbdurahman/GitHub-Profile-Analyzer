import { post, ApiError } from './api-client';

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Define the expected API response structure
interface AIResponse {
  choices?: Array<{
    message?: {
      content: string;
    };
  }>;
}

/**
 * Get a user-friendly error message based on the error
 */
function getUserFriendlyErrorMessage(error: any): string {
  // If it's our API error
  if (error instanceof ApiError) {
    // Handle specific status codes
    switch (error.status) {
      case 429:
        return "Too many requests. Please try again in a moment.";
      case 500:
      case 502:
      case 503:
      case 504:
        return "The AI service is currently experiencing issues. Please try again in a moment.";
      case 408:
        return "The request timed out. Please try again.";
      default:
        return `Error: ${error.message}`;
    }
  }

  // Handle timeout errors
  if (error.name === 'AbortError') {
    return "The request timed out. Please try again.";
  }

  // Handle network errors
  if (error.message && error.message.includes('network')) {
    return "Network error. Please check your connection and try again.";
  }

  // Generic error message
  return "An error occurred. Please try again later.";
}

/**
 * Call the AI API with retry logic and enhanced error handling
 */
export async function callAI(messages: ChatMessage[]) {
  try {
    // Call our server-side API endpoint with retry logic
    const data = await post<AIResponse>('/api/ai/chat', { messages }, {
      timeout: 60000,           // 60 second timeout
      retries: 3,               // 3 retries
      retryDelay: 1500,         // 1.5 seconds base delay between retries
      exponentialBackoff: true, // Use exponential backoff for retries
      retryStatusCodes: [408, 429, 500, 502, 503, 504], // Status codes to retry
      cache: 'no-store',
    });

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Unexpected API response format:", data);
      throw new ApiError("Invalid API response format", 500, data);
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    // Enhanced error logging
    console.error("Error calling AI API:", error);

    // Get a user-friendly error message
    const friendlyMessage = getUserFriendlyErrorMessage(error);

    // Throw a new error with the friendly message
    throw new Error(friendlyMessage);
  }
}