import { View, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ThumbsUp, MessageCircle } from 'lucide-react-native';

export interface Post {
  id: string;
  seoSlug?: string;
  title: string;
  voteScore: number;
  answerCount: number;
  author?: { username?: string };
}

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();

  return (
    <Pressable onPress={() => router.push(`/question/${post.seoSlug ?? post.id}`)} className="bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800">
      <View className="gap-2">
        <Text className="text-sm text-gray-500 dark:text-gray-400">@{post.author?.username || 'anonymous'}</Text>
        <Text className="text-base font-semibold text-gray-900 dark:text-white" numberOfLines={2}>
          {post.title}
        </Text>
        <View className="flex-row gap-4 mt-2">
          <View className="flex-row items-center gap-1">
            <ThumbsUp size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600 dark:text-gray-400">{post.voteScore}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <MessageCircle size={16} color="#6B7280" />
            <Text className="text-sm text-gray-600 dark:text-gray-400">{post.answerCount}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
