'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface NotificationToggleProps {
  onToggle?: (enabled: boolean) => void;
}

export function NotificationToggle({ onToggle }: NotificationToggleProps) {
  const { data: session } = useSession();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check browser support
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (supported && session?.user) {
      checkNotificationStatus();
    }
  }, [session?.user]);

  const checkNotificationStatus = async () => {
    try {
      if (Notification.permission === 'denied') {
        setIsEnabled(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsEnabled(!!subscription);
    } catch (err) {
      console.error('Failed to check notification status:', err);
    }
  };

  const requestPermission = async () => {
    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      setError('Notifications are blocked. Please enable them in your browser settings.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return false;
    }
  };

  const toggleNotifications = async () => {
    if (!session?.user) {
      setError('Please log in to enable notifications');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEnabled) {
        // Disable notifications
        await disableNotifications();
      } else {
        // Enable notifications
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          setIsLoading(false);
          return;
        }

        await enableNotifications();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const enableNotifications = async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Get or create push subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Get VAPID public key from environment
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error('VAPID public key not configured');
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // Send subscription to backend
      const response = await fetch('/api/v1/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: btoa(
            String.fromCharCode.apply(
              null,
              Array.from(new Uint8Array(subscription.getKey('p256dh') || [])) as any,
            ),
          ),
          auth: btoa(
            String.fromCharCode.apply(
              null,
              Array.from(new Uint8Array(subscription.getKey('auth') || [])) as any,
            ),
          ),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsEnabled(true);
      onToggle?.(true);
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      throw err;
    }
  };

  const disableNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Notify backend to unsubscribe
        await fetch('/api/v1/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Unsubscribe from push manager
        await subscription.unsubscribe();
      }

      setIsEnabled(false);
      onToggle?.(false);
    } catch (err) {
      console.error('Failed to disable notifications:', err);
      throw err;
    }
  };

  if (!isSupported) {
    return (
      <div className="text-xs text-muted-foreground">
        Notifications not supported in your browser
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Push Notifications
        </label>
        <button
          onClick={toggleNotifications}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isEnabled
              ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:hover:bg-green-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isLoading ? 'Loading...' : isEnabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {isEnabled
          ? 'You will receive notifications for new answers to your followed questions.'
          : 'Enable to get notified about new answers and activity.'}
      </p>
    </div>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
