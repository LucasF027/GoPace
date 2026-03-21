// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let message = "Ocorreu um erro inesperado.";
      let details = "";

      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.operationType) {
          message = `Erro de permissão no Firestore (${parsed.operationType})`;
          details = parsed.error;
        }
      } catch {
        details = this.state.error?.message || "";
      }

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white">
          <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold italic tracking-tighter">{message}</h2>
              <p className="text-zinc-500 text-sm">{details}</p>
            </div>
            <button 
              onClick={this.handleReset}
              className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Recarregar App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
