import { Component } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Home, Terminal, WifiOff, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false, isOffline: false, retrying: false };
  }

  static getDerivedStateFromError(error) {
    // Detect network-related errors
    const isNetworkError =
      !navigator.onLine ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('NetworkError') ||
      error?.message?.includes('Network request failed') ||
      error?.message?.includes('net::') ||
      error?.message?.includes('Load failed') ||
      error?.message?.includes('ERR_');

    return { hasError: true, error, isOffline: isNetworkError };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    if (this.state.hasError && this.state.isOffline) {
      // Auto-retry when connection comes back
      setTimeout(() => {
        this.handleReload();
      }, 1000);
    }
  };

  handleOffline = () => {
    // If app is running and goes offline, note it
    if (this.state.hasError) {
      this.setState({ isOffline: true });
    }
  };

  handleReload = () => {
    this.setState({ hasError: false, error: null, isOffline: false });
    window.location.reload();
  };

  handleRetry = () => {
    if (!navigator.onLine) {
      this.setState({ retrying: false });
      return;
    }
    this.setState({ retrying: true });
    // Brief delay then reload
    setTimeout(() => {
      this.setState({ hasError: false, error: null, isOffline: false, retrying: false });
      window.location.reload();
    }, 500);
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, isOffline: false });
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      // ── Offline / Network Error Screen ──────────────────────────
      if (this.state.isOffline || !navigator.onLine) {
        return (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary/30 font-sans">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-blue-500/20 to-sky-500/20 blur-[100px] dark:from-blue-500/10 dark:to-sky-500/10 opacity-70"
              />
            </div>

            <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center"
              >
                {/* Subtle Label */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="px-4 py-1.5 rounded-full bg-muted/50 border border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-[0.3em] mb-8 flex items-center gap-2"
                >
                  <WifiOff className="w-3 h-3 text-rose-500" />
                  Network Error
                </motion.span>

                {/* Huge Typography */}
                <h1 className="text-[12rem] sm:text-[18rem] md:text-[22rem] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground via-foreground/80 to-background select-none filter drop-shadow-xl">
                  503
                </h1>

                {/* Content */}
                <div className="-mt-8 sm:-mt-16 md:-mt-20 z-10">
                  <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
                    Connection Lost
                  </h2>
                  <p className="text-muted-foreground text-lg sm:text-xl max-w-lg mx-auto font-medium leading-relaxed mb-12">
                    Your device has lost its connection to the network. Please check your internet and try again.
                  </p>

                  <button
                    onClick={this.handleRetry}
                    disabled={this.state.retrying}
                    className="group flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20 hover:shadow-primary/40 w-full sm:w-auto mx-auto disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {this.state.retrying ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                        <span>Try Again</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}
              className="absolute bottom-8 left-0 w-full flex justify-center text-xs text-muted-foreground font-mono tracking-widest uppercase opacity-50"
            >
              <span>Error Code_503 // Status_Offline</span>
            </motion.div>
          </div>
        );
      }

      // ── Generic Error Screen (non-network errors) ──────────────
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-primary/30 font-sans">
          {/* Animated Mesh Gradient Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-primary/20 to-indigo-500/20 blur-[100px] dark:from-primary/10 dark:to-indigo-500/10 opacity-70"
            />
            <motion.div
              animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-rose-500/10 to-violet-500/20 blur-[100px] dark:from-rose-500/5 dark:to-violet-500/10 opacity-70 translate-x-1/4"
            />
          </div>

          <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              {/* Subtle Label */}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1 }}
                className="px-4 py-1.5 rounded-full bg-muted/50 border border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-[0.3em] mb-8"
              >
                Critical Anomaly
              </motion.span>

              {/* Huge Typography */}
              <h1 className="text-[12rem] sm:text-[18rem] md:text-[22rem] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground via-foreground/80 to-background select-none filter drop-shadow-xl">
                500
              </h1>

              {/* Content */}
              <div className="-mt-8 sm:-mt-16 md:-mt-20 z-10">
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">
                  System State Compromised
                </h2>
                <p className="text-muted-foreground text-lg sm:text-xl max-w-lg mx-auto font-medium leading-relaxed mb-12">
                  The FinFlo runtime encountered a synchronization conflict. Our automated telemetry has logged the trace.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={this.handleReload}
                    className="group flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-primary/20 hover:shadow-primary/40 w-full sm:w-auto"
                  >
                    <RotateCcw className="w-5 h-5 group-hover:-rotate-180 transition-transform duration-500" />
                    <span>Restore Protocol</span>
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="group flex items-center justify-center gap-3 px-8 py-4 bg-card hover:bg-muted border border-border text-foreground rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-sm w-full sm:w-auto"
                  >
                    <Home className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                    <span>Exit to Base</span>
                  </button>
                </div>
                
                {/* Technical Details */}
                <div className="mt-12">
                  <button
                    onClick={this.toggleDetails}
                    className="flex items-center gap-2 mx-auto text-xs font-bold tracking-[0.2em] text-muted-foreground hover:text-foreground uppercase transition-colors"
                  >
                    <Terminal className="w-4 h-4" />
                    {this.state.showDetails ? 'Hide System Logs' : 'View System Logs'}
                  </button>

                  {this.state.showDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 w-full max-w-2xl mx-auto px-4 sm:px-0"
                    >
                      <div className="bg-muted/30 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-border/50 font-mono text-xs leading-relaxed relative overflow-hidden group shadow-inner w-full">
                        <div className="absolute top-4 right-6 text-[10px] text-primary/50 font-black tracking-widest hidden sm:block">
                          DIAG_CONSOLE
                        </div>
                        <div className="text-foreground break-words whitespace-pre-wrap mb-3 font-semibold mt-2 sm:mt-6 text-left">
                          <span className="text-rose-500 mr-2">EXCEPTION:</span>
                          {this.state.error?.message || 'NULL_REFERENCE_ERROR'}
                        </div>
                        {this.state.error?.stack && (
                          <div className="text-muted-foreground transition-all cursor-text overflow-y-auto overflow-x-hidden max-h-48 text-[10px] break-all whitespace-pre-wrap text-left">
                            {this.state.error.stack}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Footer minimal elements */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-8 left-0 w-full flex justify-center text-xs text-muted-foreground font-mono tracking-widest uppercase opacity-50"
          >
            <span>Error Code_500 // FinFlo_OS_Pro_Beta</span>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

