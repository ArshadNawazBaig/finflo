import { useState, useEffect } from 'react';

/**
 * Custom hook to handle PWA installation logic
 * @returns {Object} { installPrompt, showInstallPrompt, isInstalled, isIOS, canInstall, isReadyForPrompt }
 */
export const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isReadyForPrompt, setIsReadyForPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Set a fallback timer to show instructions even if the event doesn't fire
    const timer = setTimeout(() => {
      setIsReadyForPrompt(true);
    }, 15000); // 15 seconds stay

    const handleBeforeInstallPrompt = (e) => {
      console.log('✅ PWA: beforeinstallprompt event fired');
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
      setIsReadyForPrompt(true);
    };

    const handleAppInstalled = () => {
      console.log('✅ PWA: appinstalled event fired');
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const showInstallPrompt = async () => {
    if (!installPrompt) {
      console.warn('❌ PWA: Prompt triggered but event not captured');
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`👤 PWA: User choice: ${outcome}`);
    setInstallPrompt(null);
  };

  return {
    installPrompt,
    showInstallPrompt,
    isInstalled,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    canInstall: !!installPrompt,
    isReadyForPrompt,
  };
};
