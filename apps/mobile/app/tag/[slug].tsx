import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, Stack } from 'expo-router';
import { apiFetch, ApiError } from '@/lib/api';
import { getInterests } from '@/lib/social';
import { PostCard, Post } from '@/components/PostCard';

type TagPage = { id: string; name: string; slug: string; postCount: number; posts: Post[] };

export default function TagScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const qc = useQueryClient();
  const tag = useQuery({
    queryKey: ['tag', slug],
    queryFn: () => apiFetch<TagPage>(`/api/v1/tags/${slug}?limit=30`),
    enabled: !!slug,
  });
  const interests = useQuery({ queryKey: ['interests'], queryFn: getInterests });
  const following = !!tag.data && (interests.data?.tagIds ?? []).includes(tag.data.id);

  const toggle = useMutation({
    mutationFn: (follow: boolean) =>
      apiFetch(`/api/v1/topics/${slug}/follow`, { method: follow ? 'POST' : 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interests'] }),
    onError: (err) => Alert.alert('Could not update', err instanceof ApiError ? err.message : 'Try again'),
  });

  const data = tag.data;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: data ? data.name : 'Topic' }} />
      <FlashList
        data={data?.posts ?? []}
        keyExtractor={(p) => p.id}
        estimatedItemSize={120}
        ListHeaderComponent={
          data ? (
            <View className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex-row justify-between items-center">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-bold text-gray-900 dark:text-white">{data.name}</Text>
                <Text className="text-gray-500 mt-1">{data.postCount} questions</Text>
              </View>
              <TouchableOpacity
                onPress={() => toggle.mutate(!following)}
                disabled={toggle.isPending || interests.isLoading}
                className={`px-4 py-2 rounded-full ${following ? 'bg-gray-200 dark:bg-gray-800' : 'bg-[#1F6B45]'}`}
              >
                <Text className={following ? 'text-gray-800 dark:text-gray-200' : 'text-white'}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="px-4 py-10 items-center">
            <Text className="text-gray-500">
              {tag.isError ? 'Topic not found.' : tag.isLoading ? 'Loading…' : 'No questions yet.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} />}
      />
    </SafeAreaView>
  );
}
