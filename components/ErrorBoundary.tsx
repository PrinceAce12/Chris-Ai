'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.addEventListener('error', this.handleErrorEvent);
  }

  public componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    window.removeEventListener('error', this.handleErrorEvent);
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault(); // Prevent Next.js error overlay
    this.setState({ 
      hasError: true, 
      error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)) 
    });
  };

  private handleErrorEvent = (event: ErrorEvent) => {
    event.preventDefault();
    this.setState({ hasError: true, error: event.error });
  };

  public render() {
    if (this.state.hasError) {
      let message = "An unexpected error occurred.";
      let details = "";
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.error.includes("Missing or insufficient permissions")) {
            message = "You don't have permission to perform this action.";
            details = "Please check your account permissions or contact support.";
          } else if (parsed.error) {
            message = "A database error occurred.";
            details = parsed.error;
          }
        }
      } catch (e) {
        // Not JSON
        message = this.state.error?.message || message;
      }

      return (
        <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-[#050505] text-black dark:text-white p-4">
          <div className="max-w-md w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-6 text-center">
            <h2 className="text-xl font-semibold mb-4 text-red-500">Something went wrong</h2>
            <p className="text-sm text-black/70 dark:text-white/70 mb-2">
              {message}
            </p>
            {details && (
              <p className="text-xs text-black/50 dark:text-white/50 mb-6 break-words">
                {details}
              </p>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black/80 dark:hover:bg-white/80 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
