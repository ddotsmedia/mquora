import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { router } from 'expo-router';
import { apiFetch, ApiError } from '@/lib/api';

interface CreatePostRequest {
  title: string;
  body?: string;
}

export default function Ask() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreatePostRequest) => apiFetch('/api/v1/posts', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      router.replace('/');
    },
    onError: (err: ApiError) => {
      if (err.status === 401) {
        router.push('/(auth)/login');
      } else {
        Alert.alert('Error', err.message);
      }
    },
  });

  const handlePost = () => {
    mutation.mutate({ title, body: body || undefined });
  };

  const isDisabled = title.length < 6 || mutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={isDisabled} onPress={handlePost}>
          <Text className={isDisabled ? 'text-gray-400' : 'text-primary font-semibold'}>Post</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-1 px-4 py-4 gap-4">
        <TextInput
          placeholder="Question title (6-300 characters)"
          value={title}
          onChangeText={setTitle}
          maxLength={300}
          className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-lg text-base"
          placeholderTextColor="#9CA3AF"
        />
        <TextInput
          placeholder="Question details (optional, max 5000)"
          value={body}
          onChangeText={setBody}
          maxLength={5000}
          multiline
          numberOfLines={6}
          className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-lg text-base"
          placeholderTextColor="#9CA3AF"
        />
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {title.length}/300 | {body.length}/5000
        </Text>
      </View>
    </SafeAreaView>
  );
}
