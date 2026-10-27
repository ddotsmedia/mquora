# @askvyo/mobile

Expo (React Native) mobile app for the askvyo Q&A platform. Phase 1 MVP with 5-tab navigation (Home, Search, Ask, Alerts, Profile), authentication, and question detail with voting.

## Stack

- **Framework**: Expo with Expo Router
- **Language**: TypeScript
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: TanStack React Query
- **Storage**: SecureStore (auth tokens), MMKV (local state)
- **UI Components**: Lucide React Native, FlashList, react-native-svg

## Quick Start

```bash
# Install dependencies
pnpm install

# Run with Expo Go
pnpm mobile

# Or run on Android
pnpm android

# Or run on iOS
pnpm ios
```

## Building

### Local Preview Builds

Requires EAS CLI (`npm install -g eas-cli`):

```bash
npx eas login
npx eas build:configure

# Android preview
pnpm build:android

# iOS preview
pnpm build:ios
```

### GitHub Actions

Configure the `EXPO_TOKEN` secret in your GitHub repository settings. Mobile builds run automatically on push to main (apps/mobile changes) or via workflow dispatch.

## Environment

Create `.env` from `.env.example`:

```
EXPO_PUBLIC_API_URL=https://askvyo.com
```

For local development:
```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Assets

Before first EAS build, ensure these 1024x1024 PNG files exist in `assets/`:
- `icon.png` — App icon
- `splash.png` — Splash screen
- `adaptive-icon.png` — Android adaptive icon
- `notification-icon.png` — Notification icon

All should use the brand color `#1F6B45`. Generate placeholder assets:

```bash
pnpm add -D sharp
node generate-assets.js
```

## API

Talks to REST API at `EXPO_PUBLIC_API_URL`:
- `POST /api/v1/auth/login` — Login
- `POST /api/v1/auth/register` — Register
- `POST /api/v1/auth/logout` — Logout
- `GET /api/v1/users/me` — Current user
- `GET /api/v1/posts` — Feed (Latest)
- `GET /api/v1/trending/posts` — Trending questions
- `GET /api/v1/trending/unanswered` — Unanswered questions
- `POST /api/v1/posts` — Create question
- `GET /api/v1/posts/{id}` — Question detail
- `POST /api/v1/posts/{id}/vote` — Upvote question
- `GET /api/v1/notifications` — User notifications
- `POST /api/v1/notifications/mark-all-read` — Mark all as read
- `GET /api/v1/users/{username}` — User profile

## Troubleshooting

Run `npx expo-doctor` to diagnose issues with native modules and configuration.
