import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  onBack?: () => void;
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
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[400px] flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {this.props.fallbackTitle || 'মডিউলে সাময়িক ত্রুটি হয়েছে'}
            </h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              পেজটি লোড করার সময় অপ্রত্যাশিত ত্রুটি দেখা দিয়েছে। নিচের বাটনে ক্লিক করে পুনরায় চেষ্টা করুন।
            </p>
            {this.state.error && (
              <div className="text-left bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-6 overflow-x-auto max-h-32 text-xs font-mono text-rose-300">
                {this.state.error.message || 'Unknown render error'}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              {this.props.onBack && (
                <button
                  type="button"
                  onClick={this.props.onBack}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> ফিরে যান
                </button>
              )}
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> রিলোড / রিফ্রেশ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
