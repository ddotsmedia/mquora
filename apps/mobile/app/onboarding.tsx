import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { listCommunities, listTags, completeOnboarding, skipOnboarding } from '@/lib/social';

export default function OnboardingScreen() {
  const qc = useQueryClient();
  const [communityIds, setCommunityIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);

  const communities = useQuery({ queryKey: ['onboarding', 'communities'], queryFn: listCommunities });
  const tags = useQuery({ queryKey: ['onboarding', 'tags'], queryFn: listTags });

  const toggle = (id: string, kind: 'community' | 'tag') => {
    const set = kind === 'community' ? setCommunityIds : setTagIds;
    set((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const done = () => {
    qc.invalidateQueries({ queryKey: ['me'] });
    qc.invalidateQueries({ queryKey: ['interests'] });
    router.replace('/');
  };

  const submit = useMutation({
    mutationFn: () => completeOnboarding(communityIds, tagIds),
    onSuccess: done,
    onError: (err: Error) => Alert.alert('Could not save', err.message),
  });

  const skip = useMutation({
    mutationFn: skipOnboarding,
    onSuccess: done,
    onError: (err: Error) => Alert.alert('Could not skip', err.message),
  });

  const total = communityIds.length + tagIds.length;
  const loading = communities.isLoading || tags.isLoading;

  const chip = (id: string, label: string, kind: 'community' | 'tag') => {
    const on = (kind === 'community' ? communityIds : tagIds).includes(id);
    return (
      <TouchableOpacity
        key={id}
        onPress={() => toggle(id, kind)}
        className={`px-3 py-2 rounded-full border ${on ? 'bg-[#1F6B45] border-[#1F6B45]' : 'border-gray-300 dark:border-gray-700'}`}
      >
        <Text className={on ? 'text-white' : 'text-gray-800 dark:text-gray-200'}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950 px-4">
      <Text className="text-2xl font-bold text-[#1F6B45] mt-4">What are you interested in?</Text>
      <Text className="text-gray-600 dark:text-gray-400 mt-1 mb-4">Pick at least 3. We will fill your feed with them.</Text>

      {loading ? (
        <ActivityIndicator color="#1F6B45" />
      ) : (
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 dark:text-white mb-2">Communities</Text>
          <View className="flex-row flex-wrap gap-2 mb-5">
            {(communities.data ?? []).map((c) => chip(c.id, c.name, 'community'))}
          </View>
          <Text className="font-semibold text-gray-900 dark:text-white mb-2">Topics</Text>
          <View className="flex-row flex-wrap gap-2">
            {(tags.data ?? []).map((t) => chip(t.id, t.name, 'tag'))}
          </View>
        </View>
      )}

      <View className="py-4 gap-3">
        <TouchableOpacity
          onPress={() => submit.mutate()}
          disabled={total < 3 || submit.isPending}
          className={`rounded-lg py-3 items-center ${total < 3 ? 'bg-gray-300' : 'bg-[#1F6B45]'}`}
        >
          <Text className="text-white font-semibold">
            {submit.isPending ? 'Saving...' : `Continue (${total}/3)`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => skip.mutate()} disabled={skip.isPending} className="items-center py-2">
          <Text className="text-gray-500">Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
