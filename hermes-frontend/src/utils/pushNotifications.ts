import client from '../api/client';

const SW_PATH = '/sw.js';

// VAPID public key — should be set via environment variable
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Check if the browser supports Push API and service workers.
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Register the push service worker.
 * Returns the ServiceWorkerRegistration or null if unsupported.
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
    });
    console.log('[Push] Service worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('[Push] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Convert a base64 VAPID key to a Uint8Array for the subscribe call.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Request notification permission from the user.
 * Returns the permission state: 'granted', 'denied', or 'default'.
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  const permission = await Notification.requestPermission();
  console.log('[Push] Permission:', permission);
  return permission;
}

/**
 * Subscribe the browser to push notifications.
 * Registers the SW, gets a PushSubscription, and sends it to the backend.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications are not supported in this browser.');
    return null;
  }

  // Request permission first
  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    console.warn('[Push] Notification permission not granted.');
    return null;
  }

  // Register service worker
  const registration = await registerServiceWorker();
  if (!registration) return null;

  // Wait for the service worker to be ready
  await navigator.serviceWorker.ready;

  try {
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        console.error('[Push] VAPID public key is not configured. Set VITE_VAPID_PUBLIC_KEY.');
        return null;
      }

      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('[Push] New subscription created.');
    }

    // Send subscription to backend
    await sendSubscriptionToServer(subscription);
    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true; // Already unsubscribed

    // Notify backend before unsubscribing
    try {
      await removeSubscriptionFromServer(subscription);
    } catch {
      // Continue with unsubscribe even if server call fails
      console.warn('[Push] Failed to notify server of unsubscription.');
    }

    const success = await subscription.unsubscribe();
    console.log('[Push] Unsubscribed:', success);
    return success;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
}

/**
 * Send the push subscription to the backend API.
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const subscriptionData = subscription.toJSON();
  await client.post('/push/subscribe', {
    endpoint: subscriptionData.endpoint,
    keys: subscriptionData.keys,
    expirationTime: subscriptionData.expirationTime ?? null,
  });
  console.log('[Push] Subscription sent to server.');
}

/**
 * Notify the backend that this subscription is being removed.
 */
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  await client.post('/push/unsubscribe', {
    endpoint: subscription.endpoint,
  });
  console.log('[Push] Unsubscription sent to server.');
}
