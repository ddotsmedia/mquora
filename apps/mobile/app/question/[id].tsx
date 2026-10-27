import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, router } from 'expo-router';
import { ThumbsUp } from 'lucide-react-native';
import { apiFetch, ApiError } from '@/lib/api';

// Route param is the post's seoSlug (the API resolves posts by slug, not id).
interface Answer {
  id: string;
  body: string;
  isAccepted: boolean;
  voteScore: number;
  author: { username: string };
}

interface Post {
  id: string;
  seoSlug: string;
  title: string;
  body: string;
  voteScore: number;
  answerCount: number;
  author: { username: string };
}

interface AnswerPage {
  data: Answer[];
  nextCursor: string | null;
}

function onAuthError(err: unknown, fallback: string) {
  if (err instanceof ApiError && err.status === 401) {
    router.push('/(auth)/login');
    return;
  }
  Alert.alert('Error', err instanceof Error ? err.message : fallback);
}

export default function QuestionDetail() {
  const { id: slug } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const { data: post } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => apiFetch<Post>(`/api/v1/posts/${slug}`),
    enabled: !!slug,
  });

  const { data: answerPage } = useQuery({
    queryKey: ['answers', post?.id],
    queryFn: () => apiFetch<AnswerPage>(`/api/v1/posts/${post!.id}/answers?limit=20`),
    enabled: !!post?.id,
  });

  const voteMutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/votes', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'POST', targetId: post!.id, voteType: 'UP' }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', slug] }),
    onError: (err) => onAuthError(err, 'Could not vote'),
  });

  const answerMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/posts/${post!.id}/answers`, {
        method: 'POST',
        body: JSON.stringify({ body: draft.trim() }),
      }),
    onSuccess: () => {
      setDraft('');
      queryClient.invalidateQueries({ queryKey: ['answers', post?.id] });
      queryClient.invalidateQueries({ queryKey: ['post', slug] });
    },
    onError: (err) => onAuthError(err, 'Could not post answer'),
  });

  if (!post) return null;

  const answers = answerPage?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <FlashList
        data={answers}
        keyExtractor={(a) => a.id}
        estimatedItemSize={100}
        renderItem={({ item: answer }) => (
          <View className={`px-4 py-3 border-b border-gray-200 dark:border-gray-800 ${answer.isAccepted ? 'bg-green-50 dark:bg-green-950' : ''}`}>
            <View className="flex-row justify-between items-start mb-2">
              <Text className="font-semibold text-gray-900 dark:text-white">@{answer.author.username}</Text>
              {answer.isAccepted && (
                <Text className="text-xs bg-green-600 text-white px-2 py-1 rounded">Accepted</Text>
              )}
            </View>
            <Text className="text-gray-700 dark:text-gray-300">{answer.body}</Text>
          </View>
        )}
        ListHeaderComponent={
          <View className="border-b border-gray-200 dark:border-gray-800">
            <View className="px-4 py-4">
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">{post.title}</Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">@{post.author.username}</Text>
              {!!post.body && <Text className="text-gray-700 dark:text-gray-300 mb-4">{post.body}</Text>}
              <View className="flex-row gap-4 items-center mb-4">
                <TouchableOpacity onPress={() => voteMutation.mutate()} className="flex-row items-center gap-1">
                  <ThumbsUp size={20} color={voteMutation.isPending ? '#D4A017' : '#1F6B45'} />
                  <Text className="text-gray-900 dark:text-white font-semibold">{post.voteScore}</Text>
                </TouchableOpacity>
                <Text className="text-gray-600 dark:text-gray-400">{post.answerCount} answers</Text>
              </View>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Write your answer (Malayalam, English or Manglish)"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={50000}
                className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 min-h-[90px] text-gray-900 dark:text-white"
              />
              <TouchableOpacity
                onPress={() => answerMutation.mutate()}
                disabled={draft.trim().length < 2 || answerMutation.isPending}
                className={`mt-3 rounded-lg py-3 items-center ${draft.trim().length < 2 ? 'bg-gray-300' : 'bg-[#1F6B45]'}`}
              >
                <Text className="text-white font-semibold">{answerMutation.isPending ? 'Posting...' : 'Post answer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}
