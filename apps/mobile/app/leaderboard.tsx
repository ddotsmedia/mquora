import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router, Stack } from 'expo-router';
import { apiFetch } from '@/lib/api';

type Row = {
  id: string;
  username: string;
  displayName: string | null;
  reputationScore: number;
  badges: { badge: { id: string; name: string } }[];
};
type Page = { data: Row[]; nextCursor: string | null };

export default function Leaderboard() {
  const board = useInfiniteQuery({
    queryKey: ['leaderboard'],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      apiFetch<Page>(`/api/v1/reputation/leaderboard?limit=25${pageParam ? `&cursor=${pageParam}` : ''}`),
    getNextPageParam: (last) => last.nextCursor,
  });

  const rows = board.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Leaderboard' }} />
      <FlashList
        data={rows}
        keyExtractor={(r) => r.id}
        estimatedItemSize={64}
        onEndReached={() => board.hasNextPage && !board.isFetchingNextPage && board.fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View className="px-4 py-10 items-center">
            <Text className="text-gray-500">{board.isLoading ? 'Loading…' : 'No members yet.'}</Text>
          </View>
        }
        ListFooterComponent={board.isFetchingNextPage ? <ActivityIndicator className="my-4" /> : null}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => router.push(`/profile/${item.username}`)}
            className="flex-row items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800"
          >
            <Text className="w-10 text-gray-500 font-semibold">{index + 1}</Text>
            <View className="flex-1 pr-3">
              <Text className="text-gray-900 dark:text-white font-semibold" numberOfLines={1}>
                {item.displayName || item.username}
              </Text>
              <Text className="text-gray-500 text-sm" numberOfLines={1}>
                @{item.username}
                {item.badges.length ? ` · ${item.badges.map((b) => b.badge.name).join(', ')}` : ''}
              </Text>
            </View>
            <Text className="text-[#1F6B45] font-bold">{item.reputationScore}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
