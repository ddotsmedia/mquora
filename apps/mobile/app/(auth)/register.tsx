import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Link } from 'expo-router';
import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { login } from '@/lib/auth';

interface RegisterRequest {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiFetch('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ displayName, username, email, password }),
      });
      await login(email, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace('/');
    },
    onError: (err: ApiError) => {
      Alert.alert('Registration failed', err.message);
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-1 px-6 justify-center gap-4">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Sign up</Text>
        <TextInput placeholder="Full name" value={displayName} onChangeText={setDisplayName} className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-lg" placeholderTextColor="#9CA3AF" />
        <TextInput placeholder="Username" value={username} onChangeText={setUsername} className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-lg" placeholderTextColor="#9CA3AF" />
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-lg" placeholderTextColor="#9CA3AF" />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-lg" placeholderTextColor="#9CA3AF" />
        <TouchableOpacity disabled={mutation.isPending} onPress={() => mutation.mutate()} className="bg-primary px-6 py-3 rounded-lg mt-2">
          <Text className="text-white font-semibold text-center">{mutation.isPending ? 'Signing up...' : 'Sign up'}</Text>
        </TouchableOpacity>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity>
            <Text className="text-primary text-center mt-4">Already have an account? Log in</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
