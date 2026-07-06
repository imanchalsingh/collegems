import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useToast } from '../hooks/useToast';
import { Download, WifiOff } from 'lucide-react';

// Using the provided interface for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export const PwaManager: React.FC = () => {
  const { toast } = useToast();
  const isOnline = useNetworkStatus();
  
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Handle service worker registration and updates
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: any) {
      console.error('SW registration error', error);
    },
  });

  const prevOnlineRef = React.useRef(isOnline);

  // Handle online/offline toast
  useEffect(() => {
    // Only show toast if the state actually changed from the previous render
    if (prevOnlineRef.current !== isOnline) {
      if (!isOnline) {
        toast.warning('You are currently offline. Viewing cached academic data.');
      } else {
        toast.success('You are back online! Data is syncing.');
      }
      prevOnlineRef.current = isOnline;
    }
  }, [isOnline, toast]);

  // Handle offline ready toast
  useEffect(() => {
    if (offlineReady) {
      toast.success('App is ready to work offline.');
      setOfflineReady(false);
    }
  }, [offlineReady, toast]);

  // Capture install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  return (
    <>
      {/* Offline Banner indicator (Optional, as Toast handles it, but good for persistence) */}
      {!isOnline && (
        <div className="fixed top-0 left-0 w-full bg-amber-500 text-white text-xs font-semibold py-1 px-4 text-center z-50 flex items-center justify-center gap-2">
          <WifiOff className="w-3 h-3" />
          Offline Mode - Data may not be up to date
        </div>
      )}

      {/* App Update Prompt */}
      {needRefresh && (
        <div className="fixed bottom-20 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm animate-in slide-in-from-bottom-5">
          <h4 className="font-bold mb-1">New content available!</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Click reload to update the portal.</p>
          <div className="flex gap-2">
            <button 
              onClick={() => updateServiceWorker(true)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              Reload
            </button>
            <button 
              onClick={() => setNeedRefresh(false)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Optional: Install App floating button if prompt is available */}
      {deferredPrompt && (
        <button
          onClick={handleInstallClick}
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg transition-all"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Install App</span>
        </button>
      )}
    </>
  );
};
