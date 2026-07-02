import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  requestPushPermission,
} from '../utils/pushNotifications';

export interface PushNotificationState {
  /** Whether the browser supports Push API and service workers */
  isSupported: boolean;
  /** Whether the user is currently subscribed to push notifications */
  isSubscribed: boolean;
  /** Current notification permission: 'granted', 'denied', or 'default' */
  permission: NotificationPermission;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Error message if the last operation failed */
  error: string | null;
}

export interface UsePushNotificationsReturn extends PushNotificationState {
  /** Toggle push notification subscription on/off */
  togglePush: () => Promise<void>;
}

/**
 * React hook for managing Web Push notification state.
 *
 * - Auto-registers the service worker on mount
 * - Checks current subscription status
 * - Provides a toggle function to subscribe/unsubscribe
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    isLoading: false,
    error: null,
  });

  // Check support and current subscription status on mount
  useEffect(() => {
    const init = async () => {
      const supported = isPushSupported();
      if (!supported) {
        setState((prev) => ({ ...prev, isSupported: false }));
        return;
      }

      const permission = 'Notification' in window
        ? Notification.permission
        : 'denied';

      let subscribed = false;

      // Register SW and check existing subscription
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          const subscription = await registration.pushManager.getSubscription();
          subscribed = subscription !== null;
        } catch {
          // SW registration may fail in dev — not critical for state init
        }
      }

      setState({
        isSupported: true,
        isSubscribed: subscribed,
        permission: permission as NotificationPermission,
        isLoading: false,
        error: null,
      });
    };

    init();
  }, []);

  const togglePush = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (state.isSubscribed) {
        // Unsubscribe
        const success = await unsubscribeFromPush();
        if (success) {
          setState((prev) => ({
            ...prev,
            isSubscribed: false,
            isLoading: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Failed to unsubscribe from push notifications.',
          }));
        }
      } else {
        // Request permission if not yet granted
        if (Notification.permission === 'default') {
          const perm = await requestPushPermission();
          setState((prev) => ({ ...prev, permission: perm }));
          if (perm !== 'granted') {
            setState((prev) => ({
              ...prev,
              isLoading: false,
              error: 'Notification permission was denied.',
            }));
            return;
          }
        } else if (Notification.permission === 'denied') {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Notifications are blocked. Please enable them in browser settings.',
          }));
          return;
        }

        // Subscribe
        const subscription = await subscribeToPush();
        if (subscription) {
          setState((prev) => ({
            ...prev,
            isSubscribed: true,
            permission: 'granted',
            isLoading: false,
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Failed to subscribe to push notifications.',
          }));
        }
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred.',
      }));
    }
  }, [state.isSubscribed]);

  return {
    ...state,
    togglePush,
  };
}
