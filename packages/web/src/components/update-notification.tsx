import { Download, RefreshCw, X, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

import { usePwaInstallation, usePwaUpdate } from '../hooks/use-pwa-update';

interface UpdateNotificationProps {
  className?: string;
}

export const UpdateNotification = ({ className }: UpdateNotificationProps) => {
  const {
    isUpdateAvailable,
    isUpdateReady,
    updateServiceWorker,
    isUpdating,
    updateError,
  } = usePwaUpdate();

  const { isInstallable, promptInstall } = usePwaInstallation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  // track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // show notification when update is available
  useEffect(() => {
    if (isUpdateAvailable || isUpdateReady || updateError || isInstallable) {
      setShowNotification(true);
    }
  }, [isUpdateAvailable, isUpdateReady, updateError, isInstallable]);

  // don't render if no notifications to show
  if (!showNotification) {
    return null;
  }

  const handleUpdate = async () => {
    await updateServiceWorker();
  };

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setShowNotification(false);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}>
      {/* offline indicator */}
      {!isOnline && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-warning-50 p-3 text-warning-800 shadow-md border border-warning-200">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">You're offline</span>
        </div>
      )}

      {/* update available notification */}
      {isUpdateAvailable && (
        <div className="mb-3 rounded-lg bg-mist-50 p-4 text-mist-800 shadow-md border border-mist-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">Update Available</p>
                <p className="text-xs text-mist-600 mt-1">
                  A new version is ready to install
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-mist-400 hover:text-mist-600 transition-colors"
              aria-label="Dismiss update notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex items-center gap-1 rounded-md bg-coral-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-coral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="h-3 w-3" />
                  Update Now
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-md border border-mist-300 px-3 py-1.5 text-xs font-medium text-mist-700 hover:bg-mist-100 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* app ready offline notification */}
      {isUpdateReady && !isUpdateAvailable && (
        <div className="mb-3 rounded-lg bg-sage-50 p-4 text-sage-800 shadow-md border border-sage-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">App Ready</p>
                <p className="text-xs text-sage-600 mt-1">
                  The app is ready to work offline
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-sage-400 hover:text-sage-600 transition-colors"
              aria-label="Dismiss ready notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* update error notification */}
      {updateError && (
        <div className="mb-3 rounded-lg bg-danger-50 p-4 text-danger-800 shadow-md border border-danger-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">Update Failed</p>
              <p className="text-xs text-danger-600 mt-1">{updateError}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-danger-400 hover:text-danger-600 transition-colors"
              aria-label="Dismiss error notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="rounded-md bg-danger-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* install prompt notification */}
      {isInstallable && (
        <div className="mb-3 rounded-lg bg-coral-50 p-4 text-coral-800 shadow-md border border-coral-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">Install App</p>
                <p className="text-xs text-coral-600 mt-1">
                  Add Spenicle to your home screen for quick access
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-coral-400 hover:text-coral-600 transition-colors"
              aria-label="Dismiss install notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="flex items-center gap-1 rounded-md bg-coral-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-coral-700 transition-colors"
            >
              <Download className="h-3 w-3" />
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-md border border-coral-300 px-3 py-1.5 text-xs font-medium text-coral-700 hover:bg-coral-100 transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
