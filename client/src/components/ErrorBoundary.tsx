import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Identifier for logging purposes */
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the whole app.
 *
 * Usage:
 * <ErrorBoundary name="Dashboard">
 *   <DashboardContent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log the error
    console.error('[ErrorBoundary]', {
      name: this.props.name || 'Unknown',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 bg-red-50/50 rounded-xl border border-red-200">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-gray-600 text-center mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            variant="outline"
            onClick={this.handleRetry}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-4 text-xs text-gray-500 max-w-full overflow-auto">
              <summary className="cursor-pointer hover:text-gray-700">
                Show error details
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-left whitespace-pre-wrap">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Page-level error boundary with full-page styling
 */
export function PageErrorBoundary({
  children,
  pageName,
}: {
  children: React.ReactNode;
  pageName?: string;
}) {
  return (
    <ErrorBoundary
      name={pageName || 'Page'}
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Page Error
            </h2>
            <p className="text-gray-600 mb-6">
              We encountered an error loading this page. Please try refreshing.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Section-level error boundary with compact styling
 */
export function SectionErrorBoundary({
  children,
  sectionName,
  onRetry,
}: {
  children: React.ReactNode;
  sectionName?: string;
  onRetry?: () => void;
}) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <ErrorBoundary
      name={sectionName || 'Section'}
      fallback={
        <div className="p-6 bg-amber-50/50 rounded-xl border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-1">
                {sectionName ? `${sectionName} unavailable` : 'Section unavailable'}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                This section encountered an error. Try refreshing.
              </p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
