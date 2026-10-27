import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Alert } from 'react-native';
import { apiFetch, ApiError } from '@/lib/api';
import { getInterests, listTags, Tag } from '@/lib/social';

export default function Topics() {
  const qc = useQueryClient();
  const tags = useQuery({ queryKey: ['onboarding', 'tags'], queryFn: listTags });
  const interests = useQuery({ queryKey: ['interests'], queryFn: getInterests });
  const followed = new Set(interests.data?.tagIds ?? []);

  const toggle = useMutation({
    mutationFn: ({ tag, follow }: { tag: Tag; follow: boolean }) =>
      apiFetch(`/api/v1/topics/${tag.slug}/follow`, { method: follow ? 'POST' : 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interests'] }),
    onError: (err) => Alert.alert('Could not update', err instanceof ApiError ? err.message : 'Try again'),
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <FlashList
        data={tags.data ?? []}
        keyExtractor={(t) => t.id}
        estimatedItemSize={56}
        renderItem={({ item }) => {
          const on = followed.has(item.id);
          return (
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <Text className="text-gray-900 dark:text-white font-semibold">{item.name}</Text>
              <TouchableOpacity
                onPress={() => toggle.mutate({ tag: item, follow: !on })}
                className={`px-4 py-2 rounded-full ${on ? 'bg-gray-200 dark:bg-gray-800' : 'bg-[#1F6B45]'}`}
              >
                <Text className={on ? 'text-gray-800 dark:text-gray-200' : 'text-white'}>{on ? 'Following' : 'Follow'}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
