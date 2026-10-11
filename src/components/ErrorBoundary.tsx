import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by AuraSlot ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF6EE] flex items-center justify-center p-6 text-[#1C1917]">
          <div className="glass-panel max-w-lg w-full p-8 text-center space-y-5 border border-red-900/15 bg-[#FFFDF9]">
            <div className="w-14 h-14 rounded-2xl bg-red-100 border border-red-200 mx-auto flex items-center justify-center text-[#DC2626]">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-2xl font-bold font-['Outfit'] text-[#1C1917]">
                Something encountered an issue
              </h2>
              <p className="text-xs text-[#78716C] mt-2 leading-relaxed">
                An unexpected exception was caught by the safety boundary. Your booked appointments and configuration in localStorage remain safe.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 text-left font-mono text-[11px] text-[#B91C1C] border border-red-200 overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <button
              onClick={this.handleReset}
              className="btn-primary px-6 py-2.5 text-xs font-semibold inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
