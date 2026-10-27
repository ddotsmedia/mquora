import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { apiFetch } from '@/lib/api';
import { PostCard, Post } from '@/components/PostCard';

type Topic = { id: string; name: string; slug: string; _count: { posts: number } };
type Community = { id: string; name: string; slug: string; _count: { members: number } };
type List<T> = { data: T[] };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6">
      <Text className="px-4 mb-2 text-lg font-bold text-gray-900 dark:text-white">{title}</Text>
      {children}
    </View>
  );
}

export default function Discover() {
  const topics = useQuery({
    queryKey: ['discover', 'topics'],
    queryFn: () => apiFetch<List<Topic>>('/api/v1/tags/trending?limit=10'),
  });
  const communities = useQuery({
    queryKey: ['discover', 'communities'],
    queryFn: () => apiFetch<List<Community>>('/api/v1/trending/communities?limit=8'),
  });
  const questions = useQuery({
    queryKey: ['discover', 'questions'],
    queryFn: () => apiFetch<List<Post>>('/api/v1/trending/posts?limit=10'),
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950" edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, title: 'Discover' }} />
      <ScrollView contentContainerClassName="pb-10">
        <Section title="Trending topics">
          <View className="flex-row flex-wrap gap-2 px-4">
            {(topics.data?.data ?? []).map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => router.push(`/tag/${t.slug}`)}
                className="px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800"
              >
                <Text className="text-gray-800 dark:text-gray-200">
                  {t.name} · {t._count.posts}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Active communities">
          {(communities.data?.data ?? []).map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => router.push('/communities')}
              className="flex-row justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800"
            >
              <Text className="flex-1 pr-3 text-gray-900 dark:text-white font-semibold" numberOfLines={1}>
                {c.name}
              </Text>
              <Text className="text-gray-500">{c._count.members} members</Text>
            </TouchableOpacity>
          ))}
        </Section>

        <Section title="Trending questions">
          {(questions.data?.data ?? []).map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
