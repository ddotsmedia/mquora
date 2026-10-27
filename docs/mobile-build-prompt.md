# askvyo mobile: build prompt for Claude Code

Read this file and execute it fully. Zero questions. Make every decision yourself. Output only: files created, commit hash, and any failure.

Local repo only: /home/claude/mquora. Do NOT touch the VPS. Do NOT run pnpm install on the VPS.

## Goal
Create apps/mobile, an Expo (React Native) app in the existing pnpm monorepo. Phase 1 MVP: 5 tabs (Home, Search, Ask, Alerts, Profile), auth (login/register), question detail with voting. Talks to the existing REST API at https://askvyo.com.

## Step 1: Directories and package.json
mkdir -p apps/mobile/{app/'(tabs)',app/'(auth)',app/question,app/profile,components,lib,assets}

Write apps/mobile/package.json:
{
  "name": "@askvyo/mobile",
  "version": "0.1.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "build:android": "eas build --platform android --profile preview --non-interactive",
    "build:ios": "eas build --platform ios --profile preview --non-interactive"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "expo-font": "~13.0.0",
    "expo-splash-screen": "~0.29.0",
    "expo-secure-store": "~14.0.0",
    "expo-notifications": "~0.29.0",
    "expo-linking": "~7.0.0",
    "expo-constants": "~17.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "4.1.0",
    "react-native-gesture-handler": "~2.20.2",
    "react-native-reanimated": "~3.16.1",
    "react-native-mmkv": "^3.1.0",
    "nativewind": "^4.1.0",
    "tailwindcss": "^3.4.0",
    "@tanstack/react-query": "^5.59.0",
    "@shopify/flash-list": "1.7.1",
    "lucide-react-native": "^0.460.0",
    "react-native-svg": "15.8.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@types/react": "~18.3.12",
    "typescript": "~5.3.3",
    "babel-plugin-module-resolver": "^5.0.0"
  }
}

Then run from apps/mobile: `pnpm install` and `npx expo install --fix`. This aligns every native-adjacent version to the SDK 52 matrix. Do not hand-edit those versions afterward. Accept whatever `--fix` resolves.

## Step 2: Config files

apps/mobile/app.json:
{
  "expo": {
    "name": "askvyo",
    "slug": "askvyo",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "askvyo",
    "userInterfaceStyle": "automatic",
    "splash": { "image": "./assets/splash.png", "resizeMode": "contain", "backgroundColor": "#1F6B45" },
    "ios": { "supportsTablet": false, "bundleIdentifier": "ae.askvyo.app", "buildNumber": "1" },
    "android": {
      "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#1F6B45" },
      "package": "ae.askvyo.app",
      "versionCode": 1
    },
    "web": { "bundler": "metro" },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      ["expo-notifications", { "icon": "./assets/notification-icon.png", "color": "#1F6B45" }]
    ],
    "experiments": { "typedRoutes": true },
    "extra": { "eas": { "projectId": "" } }
  }
}

apps/mobile/babel.config.js:
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      'react-native-reanimated/plugin',
      ['module-resolver', { root: ['./'], alias: { '@': './' } }],
    ],
  };
};

apps/mobile/tailwind.config.js:
const { hairlineWidth } = require('nativewind/theme');
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: '#1F6B45',
        accent: '#D4A017',
      },
      borderWidth: { hairline: hairlineWidth() },
    },
  },
  plugins: [],
};

apps/mobile/tsconfig.json:
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}

apps/mobile/metro.config.js:
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });

apps/mobile/global.css:
@tailwind base;
@tailwind components;
@tailwind utilities;

apps/mobile/eas.json:
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": { "autoIncrement": true }
  },
  "submit": { "production": {} }
}

apps/mobile/.env.example:
EXPO_PUBLIC_API_URL=https://askvyo.com

## Step 3: lib/

apps/mobile/lib/api.ts:
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://askvyo.com';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string>) ?? {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(err.message ?? 'Request failed', res.status);
  }
  return res.json();
}

apps/mobile/lib/auth.ts:
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from './api';

export type Me = { id: string; username: string; displayName: string; email: string; bio: string; profile?: { credential?: string | null } | null };

export async function login(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string; refreshToken: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await SecureStore.setItemAsync('accessToken', data.accessToken);
  await SecureStore.setItemAsync('refreshToken', data.refreshToken);
}

export async function logout() {
  await apiFetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}

export const getMe = () => apiFetch<Me>('/api/v1/users/me');

apps/mobile/lib/store.ts:
import { MMKV } from 'react-native-mmkv';
export const storage = new MMKV({ id: 'askvyo' });

## Step 4: Root and tabs

apps/mobile/app/_layout.tsx:
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
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

apps/mobile/app/(tabs)/_layout.tsx:
import { Tabs } from 'expo-router';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1F6B45', tabBarInactiveTintColor: '#9CA3AF' }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color }) => <Search size={22} color={color} /> }} />
      <Tabs.Screen name="ask" options={{ title: 'Ask', tabBarIcon: () => <PlusCircle size={26} color="#D4A017" />, tabBarLabel: () => null }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts', tabBarIcon: ({ color }) => <Bell size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  );
}

## Step 5: Screens

Use NativeWind className on all views. Wrap each screen in SafeAreaView from react-native-safe-area-context. Use FlashList for every list, with estimatedItemSize set.

apps/mobile/components/PostCard.tsx: Pressable card. Shows title (2 lines max), @username, vote score, answer count. onPress: router.push(`/question/${post.id}`).

apps/mobile/app/(tabs)/index.tsx (Home): segmented tabs Latest (GET /api/v1/posts?limit=20), Top (GET /api/v1/trending/posts?limit=20), Unanswered (GET /api/v1/trending/unanswered?limit=20). useInfiniteQuery keyed ['feed', tabId]. Cursor is the `nextCursor` field, appended as `&cursor=`. onEndReached fetches next page. Pull-to-refresh via RefreshControl. Empty state text: "No questions yet".

apps/mobile/app/(tabs)/search.tsx: TextInput autofocus. onSubmitEditing sets query. useQuery keyed ['search', q], enabled when q.length > 1, GET /api/v1/posts?q=<encoded>&limit=20. Empty state shows the query.

apps/mobile/app/(tabs)/ask.tsx: Title input (6 to 300 chars), optional body (max 5000). Header Cancel and Post. useMutation POST /api/v1/posts body {title, body}. On success router.replace('/'). Post disabled until title length >= 6. If not logged in (apiFetch 401), router.push('/(auth)/login').

apps/mobile/app/(tabs)/notifications.tsx: useQuery ['notifications'] GET /api/v1/notifications?limit=50. Row shows message + date, unread rows tinted. Tap goes to question/[postId] when present. "Mark all read" calls POST /api/v1/notifications/mark-all-read, then invalidates. If 401, show a "Log in to see alerts" button to /(auth)/login.

apps/mobile/app/(tabs)/profile.tsx: useQuery ['me'] via getMe, retry false. If error, show "Log in" button to /(auth)/login. Otherwise show displayName, @username, credential, bio. Buttons: Settings (no-op for Phase 1, disabled), Log out (Alert confirm, then logout(), invalidate ['me'], router.replace('/')).

apps/mobile/app/question/[id].tsx: useQuery ['post', id] GET /api/v1/posts/{id}. Show title, body, author, voteScore, answerCount, and answers list (accepted badge). Upvote button POST /api/v1/posts/{id}/vote body {value: 1}, then invalidate. On error, Alert.

apps/mobile/app/(auth)/_layout.tsx: Stack with headerShown false.

apps/mobile/app/(auth)/login.tsx: email, password, submit calls login(email,password), then invalidate ['me'], router.replace('/'). Link to register. Errors via Alert.

apps/mobile/app/(auth)/register.tsx: displayName, username, email, password. POST /api/v1/auth/register, then login(), then invalidate, router.replace('/'). Link back to login.

apps/mobile/app/profile/[username].tsx: placeholder screen. GET /api/v1/users/{username}. Shows displayName and bio. No other features in Phase 1.

## Step 6: Assets
Create apps/mobile/assets/ with a 1024x1024 green (#1F6B45) PNG for icon.png, splash.png, adaptive-icon.png, notification-icon.png. Generate them with a script (for example node + sharp, or ImageMagick if present). If generation fails, write a README note and continue. Do not block the build on assets.

## Step 7: CI
.github/workflows/mobile.yml:
name: Mobile Build
on:
  push:
    branches: [main]
    paths: ['apps/mobile/**']
  workflow_dispatch:
    inputs:
      platform:
        description: Platform
        required: true
        default: android
        type: choice
        options: [android, ios, all]

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/mobile
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          cache-dependency-path: pnpm-lock.yaml
      - run: pnpm install --frozen-lockfile
        working-directory: .
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Android preview build
        if: github.event_name == 'push' || inputs.platform == 'android' || inputs.platform == 'all'
        run: eas build --platform android --profile preview --non-interactive --no-wait
      - name: iOS preview build
        if: inputs.platform == 'ios' || inputs.platform == 'all'
        run: eas build --platform ios --profile preview --non-interactive --no-wait

## Step 8: Workspace wiring
- Read /home/claude/mquora/pnpm-workspace.yaml. Add `apps/mobile` to packages if missing.
- Read /home/claude/mquora/package.json. Add script `"mobile": "pnpm --filter @askvyo/mobile start"` if missing.

## Step 9: README
Write apps/mobile/README.md with: stack summary, `pnpm install && pnpm mobile` (run with Expo Go), `npx eas login` then `npx eas build:configure`, GitHub secret EXPO_TOKEN, asset list needed before first EAS build, and EXPO_PUBLIC_API_URL for local testing.

## Step 10: Verify locally
From apps/mobile run `npx tsc --noEmit`. Fix type errors in files you wrote. Do not change API contracts. Run `npx expo-doctor` and fix what it flags inside apps/mobile only. Do not run `expo start` (interactive).

## Step 11: Commit and push
git add apps/mobile .github/workflows/mobile.yml pnpm-workspace.yaml package.json pnpm-lock.yaml
git commit -m "feat(mobile): scaffold Expo app, Phase 1 MVP

5-tab navigation, auth screens, feed and search, question detail with voting,
EAS build workflow.

Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MWbirjXvKboZarKmtEHGG1"
git push origin main

## Output
Only: list of files created, commit hash, and the first error if any step failed. No narration.
