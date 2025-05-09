/**
 * API client with retry logic and error handling
 */

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryStatusCodes?: number[];
  exponentialBackoff?: boolean;
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Enhanced fetch with timeout, retry logic, and error handling
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 60000,  // 60 seconds default timeout
    retries = 3,      // 3 retries by default
    retryDelay = 1000, // 1 second delay between retries
    retryStatusCodes = [408, 429, 500, 502, 503, 504], // Status codes to retry
    exponentialBackoff = true, // Use exponential backoff for retries
    ...fetchOptions
  } = options;

  // Add timeout to fetch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Add signal to options
  const fetchOpts = {
    ...fetchOptions,
    signal: controller.signal
  };

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  // Try the fetch with retries
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, fetchOpts);
      lastResponse = response;

      // Clear the timeout since fetch completed
      clearTimeout(timeoutId);

      // If we get a retryable status code, we'll retry
      if (retryStatusCodes.includes(response.status)) {
        console.warn(`API returned status ${response.status}, retrying (attempt ${attempt + 1}/${retries})...`);

        // Wait before retrying
        if (attempt < retries - 1) {
          const delay = exponentialBackoff
            ? retryDelay * Math.pow(2, attempt) // Exponential backoff
            : retryDelay * (attempt + 1);       // Linear backoff

          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (error: any) {
      lastError = error;

      console.warn(`API request failed: ${error.message}, retrying (attempt ${attempt + 1}/${retries})...`);

      // If it's not a timeout, or we've used all retries, throw the error
      if (error.name !== 'AbortError' || attempt === retries - 1) {
        clearTimeout(timeoutId);
        throw error;
      }

      // Wait before retrying with exponential backoff
      const delay = exponentialBackoff
        ? retryDelay * Math.pow(2, attempt) // Exponential backoff
        : retryDelay * (attempt + 1);       // Linear backoff

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  clearTimeout(timeoutId);

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * Make a GET request with retry logic
 */
export async function get<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'GET',
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      `API returned ${response.status}: ${JSON.stringify(errorData)}`,
      response.status,
      errorData
    );
  }

  return await response.json();
}

/**
 * Make a POST request with retry logic
 */
export async function post<T>(url: string, data: any, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data),
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      `API returned ${response.status}: ${JSON.stringify(errorData)}`,
      response.status,
      errorData
    );
  }

  return await response.json();
}
