import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // Optionally log to a monitoring service
    // console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center text-center p-6" style={{ background: '#0b1220', color: '#f8fafc' }}>
          <div>
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-white/30 border-t-white animate-spin mb-4" />
            <h1 className="text-lg font-semibold mb-1">Something went wrong</h1>
            <p className="text-sm opacity-80">Please refresh the page. If the problem persists, try again later.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
