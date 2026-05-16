import { Component } from 'react';
import { motion } from 'framer-motion';
import { getDefaultStore } from 'jotai';
import {
  RotateCcw,
  Home,
  Terminal,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { isRedirectingAtom } from '@/atoms';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
      isOffline: false,
      retrying: false,
    };
  }

  static getDerivedStateFromError(error) {
    // If we're mid-redirect after an expired session, render errors are
    // almost always cascade failures from components reading null auth
    // state. Skip the error screen so the user gets a clean handoff to the
    // login page.
    try {
      if (getDefaultStore().get(isRedirectingAtom)) {
        return { hasError: false, error: null };
      }
    } catch {
      // fall through to normal handling
    }

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
      setTimeout(() => {
        this.handleReload();
      }, 1000);
    }
  };

  handleOffline = () => {
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
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        isOffline: false,
        retrying: false,
      });
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

  renderShell({ eyebrowIcon: EyebrowIcon, eyebrowText, eyebrowTone, headline, subtext, children }) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.05] pointer-events-none text-slate-900 dark:text-white"
          style={{
            backgroundImage:
              'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Soft radial spotlight */}
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-2xl mx-auto text-center"
        >
          {/* Icon chip + eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5 ${eyebrowTone}`}
            >
              <EyebrowIcon />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
              {eyebrowText}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white mb-5">
            {headline}
          </h1>

          {/* Subhead */}
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed mb-10">
            {subtext}
          </p>

          {children}
        </motion.div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // ── Offline / Network Error ──
      if (this.state.isOffline || !navigator.onLine) {
        return this.renderShell({
          eyebrowIcon: WifiOff,
          eyebrowText: '503 · Network error',
          eyebrowTone: 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
          headline: 'Connection lost.',
          subtext:
            'Your device has lost its connection to the network. Check your internet and try again — we’ll reconnect you automatically when you’re back online.',
          children: (
            <div className="flex justify-center">
              <button
                onClick={this.handleRetry}
                disabled={this.state.retrying}
                className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-7 py-3.5 rounded-full font-bold text-sm shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {this.state.retrying ? (
                  <>
                    <RefreshCw
                      size={14}
                      strokeWidth={2.5}
                      className="animate-spin"
                    />
                    Connecting...
                  </>
                ) : (
                  <>
                    <RefreshCw
                      size={14}
                      strokeWidth={2.5}
                      className="group-hover:rotate-180 transition-transform duration-500"
                    />
                    Try again
                    <span className="ml-1 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
                      <ArrowRight size={12} strokeWidth={3} />
                    </span>
                  </>
                )}
              </button>
            </div>
          ),
        });
      }

      // ── Generic Error ──
      return this.renderShell({
        eyebrowIcon: AlertTriangle,
        eyebrowText: '500 · Something went wrong',
        eyebrowTone: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
        headline: "We hit a snag.",
        subtext:
          "The app ran into an unexpected error. Our team has been notified — try refreshing the page or head back home.",
        children: (
          <>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={this.handleReload}
                className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-7 py-3.5 rounded-full font-bold text-sm shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
              >
                <RotateCcw
                  size={14}
                  strokeWidth={2.5}
                  className="group-hover:-rotate-180 transition-transform duration-500"
                />
                Reload page
                <span className="ml-1 w-6 h-6 rounded-full bg-white text-primary flex items-center justify-center">
                  <ArrowRight size={12} strokeWidth={3} />
                </span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] px-5 py-3 rounded-full transition-all"
              >
                <Home size={14} strokeWidth={2.5} />
                Go home
              </button>
            </div>

            {/* Technical Details */}
            <div className="mt-10">
              <button
                onClick={this.toggleDetails}
                className="inline-flex items-center gap-1.5 mx-auto text-[11px] font-bold tracking-[0.15em] text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 uppercase transition-colors"
              >
                <Terminal size={12} strokeWidth={2.5} />
                {this.state.showDetails ? 'Hide details' : 'View details'}
              </button>

              {this.state.showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-5 w-full max-w-2xl mx-auto"
                >
                  <div className="rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 font-mono text-xs leading-relaxed text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-2">
                      Stack trace
                    </p>
                    <div className="text-slate-900 dark:text-white break-words whitespace-pre-wrap mb-3 font-semibold">
                      <span className="text-rose-500 mr-2">EXCEPTION:</span>
                      {this.state.error?.message || 'NULL_REFERENCE_ERROR'}
                    </div>
                    {this.state.error?.stack && (
                      <div className="text-slate-500 dark:text-slate-400 overflow-y-auto overflow-x-hidden max-h-48 text-[10px] break-all whitespace-pre-wrap">
                        {this.state.error.stack}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </>
        ),
      });
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
