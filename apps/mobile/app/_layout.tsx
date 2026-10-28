import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import { registerForPush } from '@/lib/push';
import { updateRequiredFor } from '@/lib/version';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });

export default function RootLayout() {
  useEffect(() => {
    registerForPush();
    updateRequiredFor().then((minVersion) => {
      if (!minVersion) return;
      Alert.alert('Update required', `Please update askvyo to version ${minVersion} or later to continue.`, [
        { text: 'Update', onPress: () => Linking.openURL('https://askvyo.com') },
      ], { cancelable: false });
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
            <Stack.Screen name="question/[id]" options={{ headerShown: true, title: '' }} />
            <Stack.Screen name="profile/[username]" options={{ headerShown: true, title: '' }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: true, title: 'Edit profile' }} />
            <Stack.Screen name="drafts" options={{ headerShown: true, title: 'Drafts' }} />
            <Stack.Screen name="answer-requests" options={{ headerShown: true, title: 'Answer requests' }} />
            <Stack.Screen name="topics" options={{ headerShown: true, title: 'Topics' }} />
            <Stack.Screen name="bookmarks" options={{ headerShown: true, title: 'Saved' }} />
            <Stack.Screen name="communities" options={{ headerShown: true, title: 'Communities' }} />
            <Stack.Screen name="tag/[slug]" options={{ headerShown: true, title: '' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
