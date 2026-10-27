import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from 'expo-router';
import { ThumbsUp } from 'lucide-react-native';
import { apiFetch, ApiError } from '@/lib/api';

interface Answer {
  id: string;
  body: string;
  author: { username: string };
  accepted: boolean;
}

interface Post {
  id: string;
  title: string;
  body: string;
  voteScore: number;
  answerCount: number;
  author: { username: string };
  answers: Answer[];
}

export default function QuestionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: post } = useQuery({
    queryKey: ['post', id],
    queryFn: () => apiFetch<Post>(`/api/v1/posts/${id}`),
  });

  const voteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/v1/posts/${id}/vote`, { method: 'POST', body: JSON.stringify({ value: 1 }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['post', id] }),
    onError: (err: ApiError) => Alert.alert('Error', err.message),
  });

  if (!post) return null;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <FlashList
        data={post.answers}
        renderItem={({ item: answer }) => (
          <View className={answer.accepted ? 'bg-green-50 dark:bg-green-950' : ''}>
            <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="font-semibold text-gray-900 dark:text-white">@{answer.author.username}</Text>
                {answer.accepted && <Text className="text-xs bg-green-600 text-white px-2 py-1 rounded">Accepted</Text>}
              </View>
              <Text className="text-gray-700 dark:text-gray-300">{answer.body}</Text>
            </View>
          </View>
        )}
        estimatedItemSize={80}
        ListHeaderComponent={
          <View className="border-b border-gray-200 dark:border-gray-800">
            <View className="px-4 py-4">
              <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">{post.title}</Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">@{post.author.username}</Text>
              {post.body && <Text className="text-gray-700 dark:text-gray-300 mb-4">{post.body}</Text>}
              <View className="flex-row gap-4 items-center">
                <TouchableOpacity onPress={() => voteMutation.mutate()} className="flex-row items-center gap-1">
                  <ThumbsUp size={20} color={voteMutation.isPending ? '#D4A017' : '#1F6B45'} />
                  <Text className="text-gray-900 dark:text-white font-semibold">{post.voteScore}</Text>
                </TouchableOpacity>
                <Text className="text-gray-600 dark:text-gray-400">{post.answerCount} answers</Text>
              </View>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}
