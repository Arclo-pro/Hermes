import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { ApiError, getErrorMessage, logApiError } from '@/lib/apiClient';

interface AsyncActionOptions {
  /** Success message to show as toast */
  successMessage?: string;
  /** Error message prefix (actual error will be appended) */
  errorMessage?: string;
  /** Page name for logging */
  page?: string;
  /** Action name for logging */
  action?: string;
  /** Callback on success */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: Error | ApiError) => void;
  /** Whether to show toast on error (default: true) */
  showErrorToast?: boolean;
  /** Whether to show toast on success (default: true if successMessage provided) */
  showSuccessToast?: boolean;
}

interface AsyncActionState {
  isLoading: boolean;
  error: Error | ApiError | null;
  isSuccess: boolean;
}

interface AsyncActionResult<T> extends AsyncActionState {
  execute: (...args: unknown[]) => Promise<T | undefined>;
  reset: () => void;
}

/**
 * Hook for safe async operations with consistent loading, error, and success states.
 * Wraps any async function with try/catch, toast notifications, and logging.
 *
 * @example
 * const { execute, isLoading, error } = useAsyncAction(
 *   async (siteId: string) => {
 *     const { data, error } = await apiClient.post('/api/crawl', { siteId });
 *     if (error) throw error;
 *     return data;
 *   },
 *   {
 *     successMessage: 'Crawl started',
 *     errorMessage: 'Failed to start crawl',
 *     page: 'TechnicalSEO',
 *     action: 'startCrawl',
 *   }
 * );
 *
 * // In button handler:
 * <Button onClick={() => execute(siteId)} disabled={isLoading}>
 *   {isLoading ? <Spinner /> : 'Start Crawl'}
 * </Button>
 */
export function useAsyncAction<T, A extends unknown[] = []>(
  asyncFn: (...args: A) => Promise<T>,
  options: AsyncActionOptions = {}
): AsyncActionResult<T> {
  const {
    successMessage,
    errorMessage = 'An error occurred',
    page,
    action,
    onSuccess,
    onError,
    showErrorToast = true,
    showSuccessToast,
  } = options;

  const [state, setState] = useState<AsyncActionState>({
    isLoading: false,
    error: null,
    isSuccess: false,
  });

  // Use ref to prevent stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const execute = useCallback(async (...args: unknown[]): Promise<T | undefined> => {
    // Prevent double execution
    if (state.isLoading) return undefined;

    setState({ isLoading: true, error: null, isSuccess: false });

    try {
      const result = await asyncFn(...(args as A));

      setState({ isLoading: false, error: null, isSuccess: true });

      // Show success toast
      if (successMessage && (showSuccessToast !== false)) {
        toast.success(successMessage);
      }

      // Call success callback
      onSuccess?.();

      return result;
    } catch (e) {
      const error = e as Error | ApiError;

      setState({ isLoading: false, error, isSuccess: false });

      // Log the error
      if ('code' in error && 'status' in error) {
        // It's an ApiError
        logApiError(error, { page, action });
      } else {
        console.error('[AsyncAction Error]', {
          page,
          action,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      // Show error toast
      if (showErrorToast) {
        const message = 'code' in error && 'status' in error
          ? getErrorMessage(error)
          : error.message || errorMessage;
        toast.error(`${errorMessage}: ${message}`);
      }

      // Call error callback
      onError?.(error);

      return undefined;
    }
  }, [asyncFn, successMessage, showSuccessToast, onSuccess, showErrorToast, errorMessage, page, action, onError, state.isLoading]);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, isSuccess: false });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Simplified hook for retry-able operations
 * Automatically tracks retry count and shows appropriate messages
 */
export function useRetryableAction<T>(
  asyncFn: () => Promise<T>,
  options: AsyncActionOptions & { maxRetries?: number } = {}
): AsyncActionResult<T> & { retryCount: number; canRetry: boolean } {
  const { maxRetries = 3, ...actionOptions } = options;
  const [retryCount, setRetryCount] = useState(0);

  const actionResult = useAsyncAction<T>(
    async () => {
      const result = await asyncFn();
      setRetryCount(0); // Reset on success
      return result;
    },
    {
      ...actionOptions,
      onError: (error) => {
        setRetryCount(prev => prev + 1);
        actionOptions.onError?.(error);
      },
    }
  );

  return {
    ...actionResult,
    retryCount,
    canRetry: retryCount < maxRetries,
  };
}

export default useAsyncAction;
