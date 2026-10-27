import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, router } from 'expo-router';
import { apiFetch } from '@/lib/api';

interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  reputationScore: number;
  profile?: { credential?: string | null; location?: string | null } | null;
}

interface UserAnswer {
  id: string;
  body: string;
  voteScore: number;
  isAccepted: boolean;
  post: { seoSlug: string; title: string };
}

export default function PublicProfile() {
  const { username } = useLocalSearchParams<{ username: string }>();

  const { data: user, error } = useQuery({
    queryKey: ['user', username],
    queryFn: () => apiFetch<PublicUser>(`/api/v1/users/${username}`),
    enabled: !!username,
  });

  const { data: answersPage } = useQuery({
    queryKey: ['user-answers', username],
    queryFn: () => apiFetch<UserAnswer[] | { data: UserAnswer[] }>(`/api/v1/users/${username}/answers`),
    enabled: !!username,
  });
  const answers = Array.isArray(answersPage) ? answersPage : answersPage?.data ?? [];

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-950 justify-center items-center">
        <Text className="text-gray-600 dark:text-gray-400">User not found</Text>
      </SafeAreaView>
    );
  }
  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <FlashList
        data={answers}
        keyExtractor={(a) => a.id}
        estimatedItemSize={100}
        ListHeaderComponent={
          <View className="px-4 py-6 border-b border-gray-200 dark:border-gray-800">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">{user.displayName}</Text>
            <Text className="text-gray-600 dark:text-gray-400 mt-1">@{user.username}</Text>
            {!!user.profile?.credential && <Text className="text-sm text-accent mt-2 font-semibold">{user.profile.credential}</Text>}
            {!!user.bio && <Text className="text-gray-700 dark:text-gray-300 mt-3">{user.bio}</Text>}
            <Text className="text-xs text-gray-500 mt-3">Reputation {user.reputationScore}</Text>
            <Text className="font-semibold text-gray-900 dark:text-white mt-6 mb-1">Answers</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push(`/question/${item.post.seoSlug}`)} className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <Text className="text-xs text-gray-500 mb-1">{item.post.title}</Text>
            <Text className="text-gray-700 dark:text-gray-300" numberOfLines={3}>{item.body}</Text>
            <Text className="text-xs text-gray-500 mt-1">
              {item.voteScore} votes{item.isAccepted ? ' · Accepted' : ''}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text className="text-gray-500 text-center py-6">No answers yet</Text>}
      />
    </SafeAreaView>
  );
}
