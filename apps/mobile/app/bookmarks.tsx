import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { apiFetch } from '@/lib/api';

type BookmarkItem = {
  createdAt: string;
  post: { id: string; seoSlug: string; title: string; voteScore: number; answerCount: number };
};

export default function Bookmarks() {
  const { data } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => apiFetch<{ data: BookmarkItem[] }>('/api/v1/bookmarks?limit=50'),
  });
  const items = data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      {items.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600 dark:text-gray-400">No saved questions</Text>
        </View>
      ) : (
        <FlashList
          data={items}
          keyExtractor={(b) => b.post.id}
          estimatedItemSize={72}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/question/${item.post.seoSlug}`)} className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <Text className="font-semibold text-gray-900 dark:text-white">{item.post.title}</Text>
              <Text className="text-xs text-gray-500 mt-1">
                {item.post.answerCount} answers · {item.post.voteScore} votes
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
