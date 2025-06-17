import { useCallback, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface UpdateInfo {
  isUpdateAvailable: boolean;
  isUpdateReady: boolean;
  updateServiceWorker: () => Promise<void>;
  isUpdating: boolean;
  updateError: string | null;
}

export const usePwaUpdate = (): UpdateInfo => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const {
    needRefresh: [isUpdateAvailable, setIsUpdateAvailable],
    offlineReady: [isUpdateReady, setIsUpdateReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      // service worker registration success
      console.log('SW Registered: ', registration);
      
      // check for updates periodically (every 60 seconds)
      setInterval(() => {
        registration?.update();
      }, 60000);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
      setUpdateError('Failed to register service worker');
    },
    onNeedRefresh() {
      // new version available
      setIsUpdateAvailable(true);
      console.log('New app version available');
    },
    onOfflineReady() {
      // app ready to work offline
      setIsUpdateReady(true);
      console.log('App ready to work offline');
    },
  });

  const handleUpdateServiceWorker = useCallback(async () => {
    try {
      setIsUpdating(true);
      setUpdateError(null);
      
      await updateServiceWorker(true);
      
      // reset states after successful update
      setIsUpdateAvailable(false);
      setIsUpdateReady(false);
      
      // reload page to apply new version
      window.location.reload();
    } catch (error) {
      console.error('Failed to update service worker:', error);
      setUpdateError('Failed to update application');
    } finally {
      setIsUpdating(false);
    }
  }, [updateServiceWorker, setIsUpdateAvailable, setIsUpdateReady]);


  // check for updates when component mounts
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update();
        }
      });
    }
  }, []);

  return {
    isUpdateAvailable,
    isUpdateReady,
    updateServiceWorker: handleUpdateServiceWorker,
    isUpdating,
    updateError,
  };
};

// additional hook for checking if app is installed as pwa
export const usePwaInstallation = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // check if app is already installed
    const checkInstalled = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppMode = (window.navigator as any).standalone === true;
      setIsInstalled(isInStandaloneMode || isInWebAppMode);
    };

    checkInstalled();

    // listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  };
};
