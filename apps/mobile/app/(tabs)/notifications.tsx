import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { apiFetch, ApiError } from '@/lib/api';

// Matches the API's Notification row. `link` is "/q/<seoSlug>#answer-<id>" for question alerts.
interface Notification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
}

function questionSlug(link: string | null): string | null {
  const match = link?.match(/^\/q\/([^#/?]+)/);
  return match ? match[1] : null;
}

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<NotificationsResponse>('/api/v1/notifications?limit=50'),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch('/api/v1/notifications/read-all', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleNotificationPress = (notification: Notification) => {
    const slug = questionSlug(notification.link);
    if (slug) router.push(`/question/${slug}`);
  };

  const notifications = data?.data ?? [];

  if (error instanceof ApiError && error.status === 401) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-950 justify-center items-center">
        <TouchableOpacity onPress={() => router.push('/(auth)/login')} className="bg-primary px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">Log in to see alerts</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <Text className="text-lg font-bold">Alerts</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={() => markAllReadMutation.mutate()}>
            <Text className="text-primary text-sm">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>
      {notifications.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600 dark:text-gray-400">No alerts</Text>
        </View>
      ) : (
        <FlashList
          data={notifications}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleNotificationPress(item)} className={item.readAt ? 'bg-white dark:bg-gray-900' : 'bg-blue-50 dark:bg-blue-950'}>
              <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <Text className="font-semibold text-gray-900 dark:text-white">{item.title}</Text>
                <Text className="text-gray-700 dark:text-gray-300">{item.body}</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
            </TouchableOpacity>
          )}
          estimatedItemSize={60}
        />
      )}
    </SafeAreaView>
  );
}
