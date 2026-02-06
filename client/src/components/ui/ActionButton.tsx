import React from 'react';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, ButtonProps, ButtonVariant, ButtonSize } from './button';
import { cn } from '@/lib/utils';

export interface ActionButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** The action to perform when clicked */
  onClick: () => void | Promise<void>;
  /** Loading state - shows spinner and disables button */
  isLoading?: boolean;
  /** Error state - shows error styling */
  hasError?: boolean;
  /** Success state - briefly shows success styling */
  isSuccess?: boolean;
  /** Text to show when loading */
  loadingText?: string;
  /** Text to show on error (tooltip or inline) */
  errorText?: string;
  /** Icon to show (replaced by spinner when loading) */
  icon?: React.ReactNode;
  /** Show icon on right side */
  iconRight?: boolean;
  /** Whether this is a retry button after an error */
  isRetry?: boolean;
  /** Disable double-click protection */
  allowDoubleClick?: boolean;
}

/**
 * Button component with built-in loading, error, and success states.
 * Prevents double-clicks and shows appropriate feedback.
 *
 * @example
 * <ActionButton
 *   onClick={handleRefresh}
 *   isLoading={isRefetching}
 *   icon={<RefreshCw className="w-4 h-4" />}
 * >
 *   Refresh
 * </ActionButton>
 *
 * @example
 * // With async handler
 * <ActionButton
 *   onClick={async () => {
 *     await someAsyncOperation();
 *   }}
 *   loadingText="Processing..."
 * >
 *   Submit
 * </ActionButton>
 */
export function ActionButton({
  onClick,
  isLoading = false,
  hasError = false,
  isSuccess = false,
  loadingText,
  errorText,
  icon,
  iconRight = false,
  isRetry = false,
  allowDoubleClick = false,
  children,
  disabled,
  variant = 'secondary',
  className,
  ...props
}: ActionButtonProps) {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const [internalSuccess, setInternalSuccess] = React.useState(false);

  // Combined loading state
  const showLoading = isLoading || internalLoading;
  const showSuccess = isSuccess || internalSuccess;
  const isDisabled = disabled || showLoading;

  // Handle click with internal loading state for async handlers
  const handleClick = React.useCallback(async () => {
    if (!allowDoubleClick && showLoading) return;

    try {
      const result = onClick();

      // If it's a promise, track loading state
      if (result instanceof Promise) {
        setInternalLoading(true);
        await result;
        setInternalSuccess(true);
        setTimeout(() => setInternalSuccess(false), 1500);
      }
    } catch (e) {
      // Error is expected to be handled by the caller
      // We just stop the loading state
    } finally {
      setInternalLoading(false);
    }
  }, [onClick, showLoading, allowDoubleClick]);

  // Determine what icon to show
  const displayIcon = React.useMemo(() => {
    if (showLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (showSuccess) {
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    }
    if (hasError || isRetry) {
      return icon || <RefreshCw className="w-4 h-4" />;
    }
    return icon;
  }, [showLoading, showSuccess, hasError, isRetry, icon]);

  // Determine variant based on state
  const effectiveVariant: ButtonVariant = React.useMemo(() => {
    if (hasError) return 'destructive';
    return variant;
  }, [hasError, variant]);

  // Determine text to display
  const displayText = React.useMemo(() => {
    if (showLoading && loadingText) {
      return loadingText;
    }
    if (isRetry) {
      return children || 'Retry';
    }
    return children;
  }, [showLoading, loadingText, isRetry, children]);

  return (
    <Button
      {...props}
      variant={effectiveVariant}
      disabled={isDisabled}
      onClick={handleClick}
      className={cn(
        showSuccess && 'ring-2 ring-green-500 ring-offset-2',
        hasError && 'ring-2 ring-red-500 ring-offset-2',
        className
      )}
      title={hasError && errorText ? errorText : undefined}
    >
      {displayIcon && !iconRight && (
        <span className="mr-2">{displayIcon}</span>
      )}
      {displayText}
      {displayIcon && iconRight && (
        <span className="ml-2">{displayIcon}</span>
      )}
    </Button>
  );
}

/**
 * Specialized Retry button for error states
 */
export function RetryButton({
  onClick,
  isLoading,
  children = 'Retry',
  ...props
}: Omit<ActionButtonProps, 'isRetry'>) {
  return (
    <ActionButton
      onClick={onClick}
      isLoading={isLoading}
      isRetry
      variant="outline"
      icon={<RefreshCw className="w-4 h-4" />}
      {...props}
    >
      {children}
    </ActionButton>
  );
}

/**
 * Inline error message with retry button
 */
export function InlineError({
  message,
  onRetry,
  isRetrying = false,
  className,
}: {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm',
      className
    )}>
      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
      <span className="flex-1 text-red-700">{message}</span>
      {onRetry && (
        <RetryButton onClick={onRetry} isLoading={isRetrying} size="sm">
          Retry
        </RetryButton>
      )}
    </div>
  );
}

/**
 * Empty state with optional retry
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  onAction,
  isLoading = false,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
  isLoading?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-4">{description}</p>
      )}
      {action && onAction && (
        <ActionButton onClick={onAction} isLoading={isLoading}>
          {action}
        </ActionButton>
      )}
    </div>
  );
}

export default ActionButton;
