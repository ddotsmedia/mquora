import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// The reset link is emailed and opens the askvyo website, which handles the new password.
export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  const request = useMutation({
    mutationFn: () => apiFetch('/api/v1/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email: email.trim() }) }),
    onSuccess: () => {
      Alert.alert('Check your email', 'If an account exists for that address, a reset link is on its way.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert('Could not send', 'Try again in a moment.'),
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950 px-6 justify-center gap-4">
      <Text className="text-2xl font-bold text-primary">Reset password</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
        className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-3 text-gray-900 dark:text-white"
      />
      <TouchableOpacity
        onPress={() => request.mutate()}
        disabled={!email.includes('@') || request.isPending}
        className={`rounded-full py-3.5 items-center ${email.includes('@') ? 'bg-primary' : 'bg-gray-300'}`}
      >
        <Text className="text-white font-semibold">{request.isPending ? 'Sending...' : 'Send reset link'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
