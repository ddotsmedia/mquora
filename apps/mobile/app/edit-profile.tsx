import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiFetch, ApiError } from '@/lib/api';
import { getMe } from '@/lib/auth';

type Fields = { displayName: string; bio: string; location: string; website: string; credential: string };

export default function EditProfile() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: getMe });
  const [form, setForm] = useState<Fields>({ displayName: '', bio: '', location: '', website: '', credential: '' });

  useEffect(() => {
    if (!me) return;
    const m = me as typeof me & { location?: string; website?: string };
    setForm({
      displayName: me.displayName ?? '',
      bio: me.bio ?? '',
      location: m.location ?? '',
      website: m.website ?? '',
      credential: me.profile?.credential ?? '',
    });
  }, [me]);

  const save = useMutation({
    mutationFn: () => {
      let website = form.website.trim();
      if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
      return apiFetch('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          bio: form.bio.trim(),
          location: form.location.trim(),
          website,
          credential: form.credential.trim() || null,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Saved');
      router.back();
    },
    onError: (err) => Alert.alert('Could not save', err instanceof ApiError ? err.message : 'Try again'),
  });

  const field = (key: keyof Fields, label: string, multiline = false, max = 100) => (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</Text>
      <TextInput
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
        multiline={multiline}
        maxLength={max}
        className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white"
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView className="px-4 pt-4">
        {field('displayName', 'Display name', false, 60)}
        {field('credential', 'Credential (e.g. Senior Engineer at X)', false, 80)}
        {field('bio', 'Bio', true, 500)}
        {field('location', 'Location', false, 100)}
        {field('website', 'Website', false, 200)}
        <TouchableOpacity
          onPress={() => save.mutate()}
          disabled={save.isPending || form.displayName.trim().length < 2}
          className={`rounded-lg py-3 items-center mt-2 ${form.displayName.trim().length < 2 ? 'bg-gray-300' : 'bg-[#1F6B45]'}`}
        >
          <Text className="text-white font-semibold">{save.isPending ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
