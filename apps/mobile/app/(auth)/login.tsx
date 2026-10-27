import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Link } from 'expo-router';
import { useState } from 'react';
import { login } from '@/lib/auth';
import { nextRoute } from '@/lib/onboarding-route';
import { ApiError } from '@/lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace(await nextRoute());
    },
    onError: (err: ApiError) => {
      Alert.alert('Login failed', err.message);
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="flex-1 px-6 justify-center gap-4">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Log in</Text>
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-lg" placeholderTextColor="#9CA3AF" />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-4 py-3 rounded-lg" placeholderTextColor="#9CA3AF" />
        <TouchableOpacity disabled={mutation.isPending} onPress={() => mutation.mutate()} className="bg-primary px-6 py-3 rounded-lg mt-2">
          <Text className="text-white font-semibold text-center">{mutation.isPending ? 'Logging in...' : 'Log in'}</Text>
        </TouchableOpacity>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text className="text-primary text-center mt-4">Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
