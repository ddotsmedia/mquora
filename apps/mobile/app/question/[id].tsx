import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Keyboard, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, router } from 'expo-router';
import { ThumbsUp, Bookmark, CheckCircle } from 'lucide-react-native';
import { apiFetch, ApiError } from '@/lib/api';
import { getMe } from '@/lib/auth';

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

function onApiError(err: unknown, fallback: string) {
  if (err instanceof ApiError && err.status === 401) {
    router.push('/(auth)/login');
    return;
  }
  Alert.alert('Error', err instanceof Error ? err.message : fallback);
}

export default function QuestionDetail() {
  const { id: slug } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [askUsername, setAskUsername] = useState('');

  const { data: post } = useQuery({
    queryKey: ['post', slug],
    queryFn: () => apiFetch<Post>(`/api/v1/posts/${slug}`),
    enabled: !!slug,
  });

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe, retry: false });

  const { data: answerPage } = useQuery({
    queryKey: ['answers', post?.id],
    queryFn: () => apiFetch<AnswerPage>(`/api/v1/posts/${post!.id}/answers?limit=20`),
    enabled: !!post?.id,
  });

  const { data: bookmark } = useQuery({
    queryKey: ['bookmark', post?.id],
    queryFn: () => apiFetch<{ bookmarked: boolean }>(`/api/v1/bookmarks/status/${post!.id}`),
    enabled: !!post?.id && !!me,
    retry: false,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['post', slug] });
    qc.invalidateQueries({ queryKey: ['answers', post?.id] });
  };

  const votePost = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/votes', { method: 'POST', body: JSON.stringify({ targetType: 'POST', targetId: post!.id, voteType: 'UP' }) }),
    onSuccess: refresh,
    onError: (err) => onApiError(err, 'Could not vote'),
  });

  const voteAnswer = useMutation({
    mutationFn: (answerId: string) =>
      apiFetch('/api/v1/votes', { method: 'POST', body: JSON.stringify({ targetType: 'ANSWER', targetId: answerId, voteType: 'UP' }) }),
    onSuccess: refresh,
    onError: (err) => onApiError(err, 'Could not vote'),
  });

  // The API toggles acceptance: calling it again on the accepted answer un-accepts it.
  const acceptAnswer = useMutation({
    mutationFn: (answerId: string) => apiFetch(`/api/v1/answers/${answerId}/accept`, { method: 'POST' }),
    onSuccess: refresh,
    onError: (err) => onApiError(err, 'Could not accept answer'),
  });

  const toggleBookmark = useMutation({
    mutationFn: () =>
      bookmark?.bookmarked
        ? apiFetch(`/api/v1/bookmarks/${post!.id}`, { method: 'DELETE' })
        : apiFetch('/api/v1/bookmarks', { method: 'POST', body: JSON.stringify({ postId: post!.id }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmark', post?.id] }),
    onError: (err) => onApiError(err, 'Could not save'),
  });

  const postAnswer = useMutation({
    mutationFn: () => apiFetch(`/api/v1/posts/${post!.id}/answers`, { method: 'POST', body: JSON.stringify({ body: draft.trim() }) }),
    onSuccess: () => {
      setDraft('');
      refresh();
    },
    onError: (err) => onApiError(err, 'Could not post answer'),
  });

  const askUser = useMutation({
    mutationFn: async () => {
      const profile = await apiFetch<{ id: string }>(`/api/v1/users/${askUsername.trim().replace(/^@/, '')}`);
      return apiFetch(`/api/v1/questions/${post!.id}/request-answer`, { method: 'POST', body: JSON.stringify({ requesteeId: profile.id }) });
    },
    onSuccess: () => {
      setAskUsername('');
      Keyboard.dismiss();
      Alert.alert('Request sent', 'They will be notified.');
    },
    onError: (err) => onApiError(err, 'Could not send request'),
  });

  if (!post) return null;

  const answers = answerPage?.data ?? [];
  const isOwner = !!me && me.username === post.author.username;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <FlashList
        data={answers}
        keyExtractor={(a) => a.id}
        estimatedItemSize={120}
        renderItem={({ item: answer }) => (
          <View className={`px-4 py-3 border-b border-gray-200 dark:border-gray-800 ${answer.isAccepted ? 'bg-green-50 dark:bg-green-950' : ''}`}>
            <View className="flex-row justify-between items-start mb-2">
              <TouchableOpacity onPress={() => router.push(`/profile/${answer.author.username}`)}>
                <Text className="font-semibold text-gray-900 dark:text-white">@{answer.author.username}</Text>
              </TouchableOpacity>
              {answer.isAccepted && <Text className="text-xs bg-green-600 text-white px-2 py-1 rounded">Accepted</Text>}
            </View>
            <Text className="text-gray-700 dark:text-gray-300">{answer.body}</Text>
            <View className="flex-row gap-4 items-center mt-3">
              <TouchableOpacity onPress={() => voteAnswer.mutate(answer.id)} className="flex-row items-center gap-1">
                <ThumbsUp size={16} color="#1F6B45" />
                <Text className="text-gray-700 dark:text-gray-300">{answer.voteScore}</Text>
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity onPress={() => acceptAnswer.mutate(answer.id)} className="flex-row items-center gap-1">
                  <CheckCircle size={16} color={answer.isAccepted ? '#16A34A' : '#6B7280'} />
                  <Text className="text-gray-700 dark:text-gray-300">{answer.isAccepted ? 'Unaccept' : 'Accept'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View className="border-b border-gray-200 dark:border-gray-800">
            <View className="px-4 py-4">
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">{post.title}</Text>
              <TouchableOpacity onPress={() => router.push(`/profile/${post.author.username}`)}>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">@{post.author.username}</Text>
              </TouchableOpacity>
              {!!post.body && <Text className="text-gray-700 dark:text-gray-300 mb-4">{post.body}</Text>}
              <View className="flex-row gap-4 items-center mb-4">
                <TouchableOpacity onPress={() => votePost.mutate()} className="flex-row items-center gap-1">
                  <ThumbsUp size={20} color={votePost.isPending ? '#D4A017' : '#1F6B45'} />
                  <Text className="text-gray-900 dark:text-white font-semibold">{post.voteScore}</Text>
                </TouchableOpacity>
                <Text className="text-gray-600 dark:text-gray-400">{post.answerCount} answers</Text>
                <TouchableOpacity
                  onPress={() => Share.share({ message: `${post.title}\nhttps://askvyo.com/q/${post.seoSlug}` })}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-gray-700 dark:text-gray-300">Share</Text>
                </TouchableOpacity>
                {!!me && (
                  <TouchableOpacity onPress={() => toggleBookmark.mutate()} className="flex-row items-center gap-1 ml-auto">
                    <Bookmark size={20} color={bookmark?.bookmarked ? '#D4A017' : '#6B7280'} fill={bookmark?.bookmarked ? '#D4A017' : 'none'} />
                    <Text className="text-gray-700 dark:text-gray-300">{bookmark?.bookmarked ? 'Saved' : 'Save'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row gap-2 mb-6">
                <TextInput
                  value={askUsername}
                  onChangeText={setAskUsername}
                  placeholder="Ask a user by username"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
                />
                <TouchableOpacity
                  onPress={() => askUser.mutate()}
                  disabled={askUsername.trim().length < 2 || askUser.isPending}
                  className={`rounded-lg px-4 justify-center ${askUsername.trim().length < 2 ? 'bg-gray-300' : 'bg-[#1F6B45]'}`}
                >
                  <Text className="text-white font-semibold">Ask</Text>
                </TouchableOpacity>
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
                onPress={() => postAnswer.mutate()}
                disabled={draft.trim().length < 2 || postAnswer.isPending}
                className={`mt-3 rounded-lg py-3 items-center ${draft.trim().length < 2 ? 'bg-gray-300' : 'bg-[#1F6B45]'}`}
              >
                <Text className="text-white font-semibold">{postAnswer.isPending ? 'Posting...' : 'Post answer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}
