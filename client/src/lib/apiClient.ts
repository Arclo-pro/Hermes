/**
 * Robust API client with standardized error handling
 *
 * Features:
 * - Safe JSON parsing (never throws on parse errors)
 * - Timeout support via AbortController
 * - Consistent error shape
 * - Auth error detection (401/403)
 * - Rate limit handling (429)
 * - Server error handling (5xx)
 */

export interface ApiError {
  code: string;
  status: number;
  message: string;
  requestId?: string;
  details?: unknown;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  isAuthError?: boolean;
  isRateLimited?: boolean;
  isServerError?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Default timeout: 30 seconds
const DEFAULT_TIMEOUT = 30000;

/**
 * Safely parse JSON from response text
 * Returns null if parsing fails
 */
function safeJsonParse(text: string): { parsed: unknown; error?: string } {
  try {
    const parsed = JSON.parse(text);
    return { parsed };
  } catch (e) {
    return {
      parsed: null,
      error: `Invalid JSON response: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`
    };
  }
}

/**
 * Create a standardized error object
 */
function createApiError(
  status: number,
  message: string,
  options: Partial<ApiError> = {}
): ApiError {
  const isAuthError = status === 401 || status === 403;
  const isRateLimited = status === 429;
  const isServerError = status >= 500;

  let code = 'UNKNOWN_ERROR';
  if (isAuthError) code = status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN';
  else if (isRateLimited) code = 'RATE_LIMITED';
  else if (isServerError) code = 'SERVER_ERROR';
  else if (status >= 400) code = 'CLIENT_ERROR';
  else if (options.isNetworkError) code = 'NETWORK_ERROR';
  else if (options.isTimeout) code = 'TIMEOUT';

  return {
    code,
    status,
    message,
    isAuthError,
    isRateLimited,
    isServerError,
    ...options,
  };
}

/**
 * Get user-friendly error message based on status
 */
export function getErrorMessage(error: ApiError): string {
  if (error.isNetworkError) {
    return 'Network error. Please check your connection and try again.';
  }
  if (error.isTimeout) {
    return 'Request timed out. Please try again.';
  }
  if (error.isAuthError) {
    return error.status === 401
      ? 'Session expired. Please log in again.'
      : 'You don\'t have permission to perform this action.';
  }
  if (error.isRateLimited) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (error.isServerError) {
    return 'Service temporarily unavailable. Please try again later.';
  }
  return error.message || 'An unexpected error occurred.';
}

/**
 * Main API request function
 *
 * @example
 * const { data, error } = await apiClient.get<User>('/api/user');
 * if (error) {
 *   toast.error(getErrorMessage(error));
 *   return;
 * }
 * // data is typed as User
 */
async function request<T>(
  method: string,
  url: string,
  options: {
    body?: unknown;
    timeout?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  const { body, timeout = DEFAULT_TIMEOUT, headers = {} } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: RequestInit = {
      method,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    // Read response as text first (always safe)
    const responseText = await response.text();

    // Try to parse as JSON
    const { parsed, error: parseError } = safeJsonParse(responseText);

    // Handle non-OK responses
    if (!response.ok) {
      // Try to extract error message from response
      let errorMessage = response.statusText || 'Request failed';
      let details: unknown = undefined;

      if (parsed && typeof parsed === 'object') {
        const errorObj = parsed as Record<string, unknown>;
        errorMessage = (errorObj.error || errorObj.message || errorMessage) as string;
        details = errorObj.details;
      } else if (parseError) {
        // Response wasn't valid JSON
        errorMessage = responseText.slice(0, 200) || errorMessage;
      }

      return {
        error: createApiError(response.status, errorMessage, { details }),
      };
    }

    // Handle JSON parse error on successful response
    if (parseError) {
      // If response was empty, that might be OK for some endpoints
      if (!responseText || responseText.trim() === '') {
        return { data: null as unknown as T };
      }

      return {
        error: createApiError(0, parseError, { code: 'PARSE_ERROR' }),
      };
    }

    return { data: parsed as T };

  } catch (e) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (e instanceof Error && e.name === 'AbortError') {
      return {
        error: createApiError(0, 'Request timed out', { isTimeout: true }),
      };
    }

    // Handle network errors
    if (e instanceof TypeError && e.message.includes('fetch')) {
      return {
        error: createApiError(0, 'Network error', { isNetworkError: true }),
      };
    }

    // Handle other errors
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return {
      error: createApiError(0, errorMessage, { isNetworkError: true }),
    };
  }
}

/**
 * API Client with typed methods
 */
export const apiClient = {
  get: <T>(url: string, options?: { timeout?: number; headers?: Record<string, string> }) =>
    request<T>('GET', url, options),

  post: <T>(url: string, body?: unknown, options?: { timeout?: number; headers?: Record<string, string> }) =>
    request<T>('POST', url, { body, ...options }),

  put: <T>(url: string, body?: unknown, options?: { timeout?: number; headers?: Record<string, string> }) =>
    request<T>('PUT', url, { body, ...options }),

  patch: <T>(url: string, body?: unknown, options?: { timeout?: number; headers?: Record<string, string> }) =>
    request<T>('PATCH', url, { body, ...options }),

  delete: <T>(url: string, options?: { timeout?: number; headers?: Record<string, string> }) =>
    request<T>('DELETE', url, options),
};

/**
 * Hook-friendly wrapper that throws for react-query compatibility
 * Use this in queryFn where react-query expects errors to be thrown
 */
export async function apiQueryFn<T>(url: string): Promise<T> {
  const { data, error } = await apiClient.get<T>(url);
  if (error) {
    throw error;
  }
  return data as T;
}

/**
 * Hook-friendly mutation wrapper
 * Use this in mutationFn where react-query expects errors to be thrown
 */
export async function apiMutationFn<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  body?: unknown
): Promise<T> {
  const fn = method === 'DELETE' ? apiClient.delete : apiClient[method.toLowerCase() as 'post' | 'put' | 'patch'];
  const { data, error } = await (method === 'DELETE' ? fn<T>(url) : (fn as typeof apiClient.post)<T>(url, body));
  if (error) {
    throw error;
  }
  return data as T;
}

/**
 * Logging helper for errors
 */
export function logApiError(
  error: ApiError,
  context: {
    page?: string;
    action?: string;
    endpoint?: string;
  }
) {
  const logData = {
    timestamp: new Date().toISOString(),
    ...context,
    error: {
      code: error.code,
      status: error.status,
      message: error.message,
      requestId: error.requestId,
    },
  };

  console.error('[API Error]', logData);
}
