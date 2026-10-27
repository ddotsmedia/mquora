import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { getMe, logout } from '@/lib/auth';

export default function Profile() {
  const queryClient = useQueryClient();

  const { data: me, error } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
  });

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Log out',
        onPress: async () => {
          await logout();
          queryClient.invalidateQueries({ queryKey: ['me'] });
          router.replace('/');
        },
      },
    ]);
  };

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-950 justify-center items-center">
        <TouchableOpacity onPress={() => router.push('/(auth)/login')} className="bg-primary px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">Log in</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="px-4 py-6">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">{me?.displayName}</Text>
        <Text className="text-gray-600 dark:text-gray-400 mt-1">@{me?.username}</Text>
        {me?.profile?.credential && <Text className="text-sm text-accent mt-2 font-semibold">{me.profile.credential}</Text>}
        {me?.bio && <Text className="text-gray-700 dark:text-gray-300 mt-3">{me.bio}</Text>}
        <View className="mt-6 gap-3">
          <TouchableOpacity onPress={() => router.push('/edit-profile')} className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg">
            <Text className="text-gray-900 dark:text-white font-semibold">Edit profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/drafts')} className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg">
            <Text className="text-gray-900 dark:text-white font-semibold">Drafts</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/topics')} className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg">
            <Text className="text-gray-900 dark:text-white font-semibold">Topics</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/answer-requests')} className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg">
            <Text className="text-gray-900 dark:text-white font-semibold">Answer requests</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} className="bg-red-100 dark:bg-red-900 px-4 py-3 rounded-lg">
            <Text className="text-red-700 dark:text-red-200 font-semibold">Log out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
