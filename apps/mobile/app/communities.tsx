import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { apiFetch, ApiError } from '@/lib/api';

type Community = { id: string; name: string; description: string | null; memberCount: number };

export default function Communities() {
  const qc = useQueryClient();
  const { data: list } = useQuery({
    queryKey: ['communities'],
    queryFn: () => apiFetch<{ data: Community[] }>('/api/v1/communities?limit=50'),
  });
  const { data: mine } = useQuery({
    queryKey: ['community-memberships'],
    queryFn: () => apiFetch<{ communityIds: string[] }>('/api/v1/communities/memberships/me'),
    retry: false,
  });
  const joined = new Set(mine?.communityIds ?? []);

  const toggle = useMutation({
    mutationFn: ({ id, join }: { id: string; join: boolean }) =>
      apiFetch(`/api/v1/communities/${id}/${join ? 'join' : 'leave'}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community-memberships'] });
      qc.invalidateQueries({ queryKey: ['communities'] });
    },
    onError: (err) => Alert.alert('Could not update', err instanceof ApiError && err.status === 401 ? 'Log in first' : 'Try again'),
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <FlashList
        data={list?.data ?? []}
        keyExtractor={(c) => c.id}
        estimatedItemSize={80}
        renderItem={({ item }) => {
          const on = joined.has(item.id);
          return (
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <View className="flex-1 pr-3">
                <Text className="font-semibold text-gray-900 dark:text-white">{item.name}</Text>
                <Text className="text-xs text-gray-500" numberOfLines={2}>{item.memberCount} members{item.description ? ` · ${item.description}` : ''}</Text>
              </View>
              <TouchableOpacity
                onPress={() => toggle.mutate({ id: item.id, join: !on })}
                className={`px-4 py-2 rounded-full ${on ? 'bg-gray-200 dark:bg-gray-800' : 'bg-[#1F6B45]'}`}
              >
                <Text className={on ? 'text-gray-800 dark:text-gray-200' : 'text-white'}>{on ? 'Joined' : 'Join'}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
