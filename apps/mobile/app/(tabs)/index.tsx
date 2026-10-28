import { View, Text, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useState } from 'react';
import { router } from 'expo-router';
import { apiFetch, ApiError } from '@/lib/api';
import { PostCard, Post } from '@/components/PostCard';

// API feeds return { data, nextCursor }.
interface FeedResponse {
  data: Post[];
  nextCursor?: string | null;
}

type TabId = 'latest' | 'top' | 'unanswered' | 'following' | 'foryou';

const endpoints: Record<TabId, string> = {
  latest: '/api/v1/posts?limit=20',
  top: '/api/v1/trending/posts?limit=20',
  unanswered: '/api/v1/trending/unanswered?limit=20',
  following: '/api/v1/feed/following?limit=20',
  foryou: '/api/v1/feed/for-you?limit=20',
};

const tabs: { id: TabId; label: string; authOnly?: boolean }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'top', label: 'Top' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'following', label: 'Following', authOnly: true },
  { id: 'foryou', label: 'For you', authOnly: true },
];

export default function Home() {
  const [tabId, setTabId] = useState<TabId>('latest');
  const tab = tabs.find((t) => t.id === tabId)!;

  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, error } = useInfiniteQuery({
    queryKey: ['feed', tabId],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      const url = endpoints[tabId] + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
      return apiFetch<FeedResponse>(url);
    },
    getNextPageParam: (last: FeedResponse) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const allPosts = data?.pages.flatMap((page) => page.data ?? []) ?? [];
  const needsLogin = error instanceof ApiError && error.status === 401;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row border-b border-gray-200 dark:border-gray-800">
        {tabs.map((t) => (
          <TouchableOpacity key={t.id} onPress={() => setTabId(t.id)} className={`flex-1 py-3 border-b-2 ${tabId === t.id ? 'border-primary' : 'border-transparent'}`}>
            <Text className={`text-center text-xs font-semibold ${tabId === t.id ? 'text-primary' : 'text-gray-600 dark:text-gray-400'}`}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {needsLogin ? (
        <View className="flex-1 justify-center items-center gap-3">
          <Text className="text-gray-600 dark:text-gray-400">Log in to see {tab.label}</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')} className="bg-primary px-6 py-3 rounded-lg">
            <Text className="text-white font-semibold">Log in</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={allPosts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} />}
          estimatedItemSize={100}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            isLoading ? null : (
              <View className="flex-1 justify-center items-center py-20">
                <Text className="text-gray-600 dark:text-gray-400">No questions yet</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}
