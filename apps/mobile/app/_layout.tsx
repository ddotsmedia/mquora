import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } });

export default function RootLayout() {
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
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
