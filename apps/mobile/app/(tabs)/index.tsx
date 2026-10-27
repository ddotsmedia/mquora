import { View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { PostCard, Post } from '@/components/PostCard';

interface FeedResponse {
  posts: Post[];
  nextCursor?: string;
}

export default function Home() {
  const [tabId, setTabId] = useState<'latest' | 'top' | 'unanswered'>('latest');

  const endpoints = {
    latest: '/api/v1/posts?limit=20',
    top: '/api/v1/trending/posts?limit=20',
    unanswered: '/api/v1/trending/unanswered?limit=20',
  };

  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['feed', tabId],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const url = endpoints[tabId] + (pageParam ? `&cursor=${pageParam}` : '');
      return apiFetch<FeedResponse>(url);
    },
    getNextPageParam: (lastPage: FeedResponse) => lastPage.nextCursor,
    initialPageParam: undefined,
  });

  const allPosts = data?.pages.flatMap((page: FeedResponse) => page.posts) ?? [];

  const tabs = [
    { id: 'latest' as const, label: 'Latest' },
    { id: 'top' as const, label: 'Top' },
    { id: 'unanswered' as const, label: 'Unanswered' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row border-b border-gray-200 dark:border-gray-800">
        {tabs.map((tab) => (
          <TouchableOpacity key={tab.id} onPress={() => setTabId(tab.id)} className={`flex-1 py-3 border-b-2 ${tabId === tab.id ? 'border-primary' : 'border-transparent'}`}>
            <Text className={`text-center font-semibold ${tabId === tab.id ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {allPosts.length === 0 && !isLoading ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600 dark:text-gray-400">No questions yet</Text>
        </View>
      ) : (
        <FlashList
          data={allPosts}
          renderItem={({ item }) => <PostCard post={item} />}
          estimatedItemSize={100}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center">
              <Text className="text-gray-600 dark:text-gray-400">No questions yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
