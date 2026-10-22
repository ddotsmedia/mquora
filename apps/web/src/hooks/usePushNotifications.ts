'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  toggle: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { data: session } = useSession();
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (supported && session?.user) {
      checkStatus();
    }
  }, [session?.user]);

  const checkStatus = async () => {
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

  const toggle = useCallback(async () => {
    if (!session?.user) {
      setError('Please log in first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isEnabled) {
        await disableNotifications();
      } else {
        await enableNotifications();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, session?.user]);

  const enableNotifications = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error('VAPID key not configured');

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
      });
    }

    const response = await fetch('/api/v1/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: extractKey(subscription, 'p256dh'),
        auth: extractKey(subscription, 'auth'),
      }),
    });

    if (!response.ok) throw new Error('Failed to save subscription');
    setIsEnabled(true);
  };

  const disableNotifications = async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await fetch('/api/v1/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      await subscription.unsubscribe();
    }

    setIsEnabled(false);
  };

  return { isSupported, isEnabled, isLoading, error, toggle };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

function extractKey(subscription: PushSubscription, keyName: 'p256dh' | 'auth'): string {
  const key = subscription.getKey(keyName);
  if (!key) throw new Error(`Failed to extract ${keyName}`);
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(key))));
}
