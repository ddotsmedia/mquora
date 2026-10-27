import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { apiFetch } from '@/lib/api';

type Draft = { id: string; title: string; body: string; updatedAt: string };

export default function Drafts() {
  const { data, isLoading } = useQuery({
    queryKey: ['drafts'],
    queryFn: () => apiFetch<{ data: Draft[] } | Draft[]>('/api/v1/posts/me/drafts'),
  });
  const drafts = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      {!isLoading && drafts.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600 dark:text-gray-400">No drafts</Text>
        </View>
      ) : (
        <FlashList
          data={drafts}
          keyExtractor={(d) => d.id}
          estimatedItemSize={72}
          renderItem={({ item }) => (
            <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <Text className="font-semibold text-gray-900 dark:text-white">{item.title || 'Untitled'}</Text>
              <Text className="text-xs text-gray-500 mt-1">{new Date(item.updatedAt).toLocaleDateString()}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
