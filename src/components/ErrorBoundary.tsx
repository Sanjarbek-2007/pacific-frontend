import React, { Component, ErrorInfo, ReactNode } from "react";
import { Compass, RefreshCw } from "lucide-react";

interface Props { children?: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg text-brand-text-primary flex items-center justify-center p-4 font-sans">
          <div className="card-default p-8 max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mx-auto">
              <Compass className="w-8 h-8 text-brand-accent" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Something went wrong.</h1>
              <p className="text-brand-text-secondary text-sm">Pacific encountered an unexpected error. Please refresh the page.</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-brand-text-primary text-brand-bg rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload page</span>
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}
