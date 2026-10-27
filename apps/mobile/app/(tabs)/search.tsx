import { View, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { PostCard, Post } from '@/components/PostCard';

interface SearchResponse {
  posts: Post[];
}

export default function Search() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  const { data } = useQuery({
    queryKey: ['search', debouncedQ],
    queryFn: () => apiFetch<SearchResponse>(`/api/v1/posts?q=${encodeURIComponent(debouncedQ)}&limit=20`),
    enabled: debouncedQ.length > 1,
  });

  const posts = data?.posts ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="px-4 py-3">
        <TextInput
          autoFocus
          placeholder="Search questions..."
          value={q}
          onChangeText={setQ}
          className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-2 rounded-lg"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      {debouncedQ.length > 1 && posts.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600 dark:text-gray-400">No results for "{debouncedQ}"</Text>
        </View>
      ) : (
        <FlashList
          data={posts}
          renderItem={({ item }) => <PostCard post={item} />}
          estimatedItemSize={100}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center">
              <Text className="text-gray-600 dark:text-gray-400">{debouncedQ.length > 1 ? 'No results' : 'Search to get started'}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
