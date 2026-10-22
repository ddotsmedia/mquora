# Web Push Notifications Setup

## Generate VAPID Keys

Web push notifications require VAPID keys for server identification. To generate them:

```bash
npx web-push generate-vapid-keys
```

This will output:
```
Public Key: BExxxx...
Private Key: xxxxx...
```

## Configuration

1. Install `web-push` package:
```bash
npm install -D web-push
pnpm add -D web-push
```

2. Add to `.env` or `.env.local`:
```
VAPID_PUBLIC_KEY=<generated-public-key>
VAPID_PRIVATE_KEY=<generated-private-key>
VAPID_SUBJECT=mailto:support@askvyo.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated-public-key>
```

3. Update `apps/api/src/notifications/notifications.service.ts`:
   - Uncomment the `import * as webpush from 'web-push'` line
   - Uncomment the `webpush.setVapidDetails()` configuration
   - Implement the `sendToSubscription()` method to actually send notifications

## Database Migration

Run Prisma migrations:
```bash
pnpm db:migrate
```

This creates the `NotificationSubscription` table.

## Testing

1. Start the development servers
2. Navigate to user dashboard/settings
3. Toggle "Push Notifications" on
4. Browser will request permission
5. Use admin API to send test notifications:

```bash
curl -X POST http://localhost:3100/api/v1/notifications/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "userId": "<user-id>",
    "title": "Test Notification",
    "body": "This is a test notification"
  }'
```

## Deployment Notes

- Service Worker is registered at `/sw.js`
- Push subscriptions are per-browser (endpoint is unique)
- Users can have multiple subscriptions (mobile, desktop, etc.)
- Invalid subscriptions are marked as inactive automatically
- Notifications can include data to navigate to specific questions
