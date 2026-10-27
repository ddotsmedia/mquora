import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { apiFetch } from '@/lib/api';

type AnswerRequest = {
  id: string;
  message: string | null;
  createdAt: string;
  post: { id: string; seoSlug: string; title: string; answerCount: number };
  requester: { username: string; displayName: string };
};

export default function AnswerRequests() {
  const { data } = useQuery({
    queryKey: ['answer-requests'],
    queryFn: () => apiFetch<{ data: AnswerRequest[] }>('/api/v1/me/answer-requests'),
  });
  const items = data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      {items.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600 dark:text-gray-400">No answer requests</Text>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(r) => r.id}
          estimatedItemSize={88}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/question/${item.post.seoSlug}`)} className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <Text className="text-xs text-gray-500 mb-1">@{item.requester.username} asked you</Text>
              <Text className="font-semibold text-gray-900 dark:text-white">{item.post.title}</Text>
              {!!item.message && <Text className="text-gray-700 dark:text-gray-300 mt-1">{item.message}</Text>}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
