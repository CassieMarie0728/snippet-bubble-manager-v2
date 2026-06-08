/**
 * PWA Service Worker Registration
 * Handles service worker registration, updates, and offline detection
 */

export interface PWAUpdateEvent {
  type: 'update-available' | 'update-activated' | 'offline' | 'online';
  message?: string;
}

let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
let updateListeners: Array<(event: PWAUpdateEvent) => void> = [];

/**
 * Register service worker and handle updates
 */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers not supported');
    return;
  }

  try {
    // Register service worker
    serviceWorkerRegistration = await navigator.serviceWorker.register(
      '/service-worker.js',
      { scope: '/' }
    );

    console.log('[PWA] Service Worker registered successfully');

    // Check for updates periodically
    setInterval(() => {
      serviceWorkerRegistration?.update();
    }, 60000); // Check every minute

    // Listen for updates
    serviceWorkerRegistration.addEventListener('updatefound', () => {
      const newWorker = serviceWorkerRegistration!.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker is ready
          notifyListeners({
            type: 'update-available',
            message: 'A new version of Snippet Bubbles is available',
          });
        }
      });
    });

    // Handle controller change (update activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      notifyListeners({
        type: 'update-activated',
        message: 'App updated successfully',
      });
      // Optionally reload the page
      // window.location.reload();
    });
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }

  // Monitor online/offline status
  window.addEventListener('online', () => {
    console.log('[PWA] Back online');
    notifyListeners({ type: 'online' });
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] Gone offline');
    notifyListeners({ type: 'offline', message: 'You are offline - using cached data' });
  });
}

/**
 * Notify all listeners of PWA events
 */
function notifyListeners(event: PWAUpdateEvent): void {
  updateListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[PWA] Listener error:', error);
    }
  });
}

/**
 * Subscribe to PWA events
 */
export function onPWAUpdate(listener: (event: PWAUpdateEvent) => void): () => void {
  updateListeners.push(listener);

  // Return unsubscribe function
  return () => {
    updateListeners = updateListeners.filter((l) => l !== listener);
  };
}

/**
 * Skip waiting and activate new service worker immediately
 */
export async function skipWaiting(): Promise<void> {
  if (!serviceWorkerRegistration?.waiting) return;

  serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Clear all caches
 */
export async function clearCache(): Promise<void> {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' });
  }

  // Also clear browser caches
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}

/**
 * Check if app is installable (PWA criteria met)
 */
export function isInstallable(): boolean {
  return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
}

/**
 * Get current online status
 */
export function isOnline(): boolean {
  return navigator.onLine;
}
