import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Monitor, Share, PlusSquare } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import Logo from '@/components/Logo';

const InstallPrompt = () => {
  const {
    canInstall,
    showInstallPrompt,
    isIOS,
    isInstalled,
    isReadyForPrompt,
  } = usePWA();
  const [isVisible, setIsVisible] = useState(false);

  // Debug flag from URL
  const forceShow =
    new URLSearchParams(window.location.search).get('debug_pwa') === 'true';

  useEffect(() => {
    // console.log('🔍 PWA component: check visibility:', {
    //   canInstall,
    //   isIOS,
    //   forceShow,
    //   isInstalled,
    //   isReadyForPrompt,
    //   displayMode: window.matchMedia('(display-mode: standalone)').matches
    //     ? 'standalone'
    //     : 'browser',
    // });

    if (forceShow) {
      console.log('🚀 PWA: Force-show enabled');
      setIsVisible(true);
      return;
    }

    // Disable on native Capacitor platforms (iOS/Android)
    if (
      window.Capacitor?.getPlatform() !== 'web' &&
      window.Capacitor?.getPlatform() !== undefined
    ) {
      console.log('📱 App is running natively, hiding PWA prompt');
      setIsVisible(false);
      return;
    }

    if (isReadyForPrompt && !isInstalled) {
      const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
      if (!isDismissed) {
        setIsVisible(true);
      }
    }
  }, [canInstall, isIOS, isInstalled, forceShow, isReadyForPrompt]);

  const handleInstall = () => {
    if (isIOS) return;
    showInstallPrompt();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  return (
    <>
      {/* High-visibility debug banner */}
      {forceShow && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-[10px] font-bold text-center py-1 z-[9999] uppercase tracking-widest shadow-2xl">
          PWA Debug Mode Active - Popup should be visible below
        </div>
      )}

      <AnimatePresence>
        {isVisible && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.8 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                },
              }}
              exit={{
                opacity: 0,
                y: 20,
                scale: 0.9,
                transition: { duration: 0.2 },
              }}
              className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[340px] z-[300]"
            >
              <div className="relative overflow-hidden rounded-[1.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-xl p-5 group">
                {/* Subtle Glow Effect */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-[40px] group-hover:bg-primary/20 transition-colors duration-700" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="transform group-hover:rotate-3 transition-transform duration-500">
                        <Logo showText={false} className="w-10 h-10" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                          FinFlo{' '}
                          <span className="text-primary text-xs">App</span>
                        </h4>
                        <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          Experience Mastery
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-all"
                    >
                      <X size={16} className="text-slate-500" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-6">
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      Install the dashboard for faster access and a seamless
                      experience.
                    </p>

                    {isIOS ? (
                      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 space-y-2.5">
                        <p className="text-[8px] font-bold text-primary dark:text-primary flex items-center gap-1.5 uppercase tracking-widest">
                          <Smartphone size={10} />
                          Instructions:
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-primary">
                              <Share size={10} />
                            </div>
                            1. Tap Share
                          </div>
                          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center text-primary">
                              <PlusSquare size={10} />
                            </div>
                            2. "Add to Home Screen"
                          </div>
                        </div>
                      </div>
                    ) : (
                      !canInstall && (
                        <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                          <p className="text-[8px] font-bold text-indigo-500 flex items-center gap-1.5 uppercase tracking-widest">
                            <Monitor size={10} />
                            Manual:
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-tight">
                            Click 'Install' in your browser bar or menu.
                          </p>
                        </div>
                      )
                    )}
                  </div>

                  {!isIOS && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      {canInstall ? (
                        <button
                          onClick={handleInstall}
                          className="flex-1 bg-primary text-primary-foreground h-10 rounded-xl font-bold uppercase tracking-wider text-[9px] shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-95 transition-all outline-none"
                        >
                          Install Now
                        </button>
                      ) : (
                        <button
                          onClick={handleInstall}
                          className="flex-1 bg-primary text-primary-foreground h-10 rounded-xl font-bold uppercase tracking-wider text-[9px] shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all outline-none"
                        >
                          Ready to Use
                        </button>
                      )}
                      <button
                        onClick={handleDismiss}
                        className="h-10 px-4 rounded-xl font-bold uppercase tracking-wider text-[9px] text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                      >
                        Later
                      </button>
                    </div>
                  )}

                  <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between opacity-40">
                    <div className="flex items-center gap-3">
                      <Monitor size={12} className="text-slate-500" />
                      <Smartphone size={12} className="text-slate-500" />
                    </div>
                    <span className="text-[7px] font-black tracking-[0.3em] uppercase text-slate-400">
                      Universal V2
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default InstallPrompt;
