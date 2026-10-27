import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { apiFetch } from '@/lib/api';

interface User {
  displayName: string;
  bio: string;
}

export default function ProfileDetail() {
  const { username } = useLocalSearchParams<{ username: string }>();

  const { data: user } = useQuery({
    queryKey: ['user', username],
    queryFn: () => apiFetch<User>(`/api/v1/users/${username}`),
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-gray-950">
      <View className="px-4 py-6">
        {user && (
          <>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">{user.displayName}</Text>
            {user.bio && <Text className="text-gray-700 dark:text-gray-300 mt-3">{user.bio}</Text>}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
