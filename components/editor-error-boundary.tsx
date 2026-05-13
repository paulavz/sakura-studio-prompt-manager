"use client";

import React from "react";

interface EditorErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
}

export class EditorErrorBoundary extends React.Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): EditorErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Editor crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">
            The editor encountered an error.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
