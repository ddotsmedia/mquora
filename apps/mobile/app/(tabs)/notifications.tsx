import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { apiFetch, ApiError } from '@/lib/api';

interface Notification {
  id: string;
  message: string;
  read: boolean;
  postId?: string;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
}

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiFetch<NotificationsResponse>('/api/v1/notifications?limit=50'),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiFetch('/api/v1/notifications/mark-all-read', { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleNotificationPress = (notification: Notification) => {
    if (notification.postId) {
      router.push(`/question/${notification.postId}`);
    }
  };

  const notifications = data?.notifications ?? [];

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
            <TouchableOpacity onPress={() => handleNotificationPress(item)} className={item.read ? 'bg-white dark:bg-gray-900' : 'bg-blue-50 dark:bg-blue-950'}>
              <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                <Text className="text-gray-900 dark:text-white">{item.message}</Text>
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
