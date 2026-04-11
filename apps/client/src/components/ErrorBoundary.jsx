import { Component } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  RotateCcw,
  Home,
  Terminal,
  ShieldAlert,
} from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 overflow-hidden relative font-sans">
          {/* Background Blobs (Matched with NotFound) */}
          <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
          <div className="absolute -bottom-8 right-0 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-75" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] bg-blue-900/5 rounded-full filter blur-[120px] opacity-10 pointer-events-none" />

          <div className="relative z-10 max-w-2xl w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 md:p-14 text-center shadow-[0_32px_128px_-16px_rgba(0,0,0,0.8)]"
            >
              {/* Anomaly Icon */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, -2, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-700 rounded-3xl mb-10 shadow-2xl relative group"
              >
                <ShieldAlert className="w-14 h-14 text-white" />
                <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter shadow-xl border-2 border-[#020617] transform group-hover:scale-110 transition-transform">
                  CRITICAL
                </div>
              </motion.div>

              {/* Typography */}
              <div className="space-y-4 mb-12">
                <h1 className="text-2xl md:text-5xl font-black tracking-tighter text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-500">
                  ANOMALY DETECTED
                </h1>
                <h2 className="text-xl font-bold tracking-widest text-indigo-400 uppercase">
                  System State Compromised
                </h2>
                <p className="text-slate-400 text-lg max-w-sm mx-auto leading-relaxed font-medium">
                  The FinFlo runtime encountered a synchronization conflict. Our
                  automated telemetry has logged the trace.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={this.handleReload}
                  className="group relative px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <RotateCcw className="w-4 h-4" />
                    Restore Protocol
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="group px-10 py-5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all border border-white/10 w-full sm:w-auto"
                >
                  <span className="flex items-center justify-center gap-3">
                    <Home className="w-4 h-4" />
                    Exit to Base
                  </span>
                </button>
              </div>

              {/* Technical Details Console */}
              <div className="mt-14 pt-8 border-t border-white/5">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center gap-2 mx-auto text-[10px] font-black tracking-[0.4em] text-slate-500 hover:text-indigo-400 uppercase transition-colors"
                >
                  <Terminal className="w-3 h-3" />
                  {this.state.showDetails
                    ? 'Hide System Logs'
                    : 'View System Logs'}
                </button>

                {this.state.showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 text-left"
                  >
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5 font-mono text-[11px] leading-relaxed relative overflow-hidden group">
                      <div className="absolute top-2 right-4 text-[9px] text-indigo-500/50 font-black tracking-widest">
                        DIAG_CONSOLE_V4
                      </div>
                      <div className="text-indigo-400/90 break-all mb-2">
                        <span className="text-red-500 mr-2">EXCEPTION:</span>
                        {this.state.error?.message || 'NULL_REFERENCE_ERROR'}
                      </div>
                      {this.state.error?.stack && (
                        <div className="text-slate-600 line-clamp-3 hover:line-clamp-none transition-all cursor-crosshair">
                          {this.state.error.stack}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Footer Metadata */}
            <div className="mt-10 flex justify-between px-6 opacity-30">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[10px] font-black tracking-[0.3em] text-white uppercase">
                  System
                </span>
                <span className="text-[10px] font-mono text-indigo-400 tracking-wider">
                  FINFLO_OS_PRO_BETA
                </span>
              </div>
              <div className="flex flex-col items-end gap-1 text-right">
                <span className="text-[10px] font-black tracking-[0.3em] text-white uppercase">
                  Status
                </span>
                <span className="text-[10px] font-mono text-red-500 tracking-wider font-bold">
                  RECOVERY_MODE
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
