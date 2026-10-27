import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from './api';

// Registers this device's Expo push token with the API. Silent no-op if permission is denied
// or the EAS project id is not configured yet.
export async function registerForPush() {
  try {
    const session = await SecureStore.getItemAsync('accessToken');
    if (!session) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    await apiFetch('/api/v1/notifications/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch {
    // Push is best effort; never block the app on it.
  }
}
