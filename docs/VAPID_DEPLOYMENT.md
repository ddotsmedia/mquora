# Web Push Notifications Deployment Guide

## Overview

Features 4 & 5 have been merged to main:
- **Feature 4**: Voice input for Malayalam questions and search
- **Feature 5**: Web push notifications with VAPID keys

This guide covers the deployment steps for Feature 5 (Web Push Notifications).

## Generated VAPID Keys

The following VAPID keys have been generated for the deployment. These are **ONE-TIME generated keys** and should be stored securely.

**VAPID Public Key:**
```
BIeW5mEqbYTcEZtB8S2WwUz0kelGs5OYqui0wiSGL6PAf5q1h7c_BSn0QWZkyKEkTMCt_xt5ITsQNgGJwt0mRWg
```

**VAPID Private Key:**
```
zYp2WSQn2BebLxAavybDT46xc--YG7UX6sXdjqcEiEg
```

**VAPID Subject (Mailto):**
```
mailto:support@askvyo.com
```

## GitHub Secrets Setup

Add the following secrets to your GitHub repository settings (Settings → Secrets and variables → Actions):

1. **VAPID_PUBLIC_KEY**
   - Value: `BIeW5mEqbYTcEZtB8S2WwUz0kelGs5OYqui0wiSGL6PAf5q1h7c_BSn0QWZkyKEkTMCt_xt5ITsQNgGJwt0mRWg`
   - Type: Regular Secret
   - Scope: Actions

2. **VAPID_PRIVATE_KEY**
   - Value: `zYp2WSQn2BebLxAavybDT46xc--YG7UX6sXdjqcEiEg`
   - Type: Regular Secret
   - Scope: Actions

3. Verify **PROD_ENV** secret exists and includes:
   ```
   VAPID_PUBLIC_KEY=<public-key-from-above>
   VAPID_PRIVATE_KEY=<private-key-from-above>
   VAPID_SUBJECT=mailto:support@askvyo.com
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public-key-from-above>
   ```

## Environment Variables

Update `.env` or your production environment with:

```env
# Web Push Notifications (VAPID Keys)
VAPID_PUBLIC_KEY=BIeW5mEqbYTcEZtB8S2WwUz0kelGs5OYqui0wiSGL6PAf5q1h7c_BSn0QWZkyKEkTMCt_xt5ITsQNgGJwt0mRWg
VAPID_PRIVATE_KEY=zYp2WSQn2BebLxAavybDT46xc--YG7UX6sXdjqcEiEg
VAPID_SUBJECT=mailto:support@askvyo.com

# Client-side (public, safe to expose)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIeW5mEqbYTcEZtB8S2WwUz0kelGs5OYqui0wiSGL6PAf5q1h7c_BSn0QWZkyKEkTMCt_xt5ITsQNgGJwt0mRWg
```

## Deployment Flow

### GitHub Actions Pipeline (Automatic)

1. **Trigger**: Push to main branch
2. **Check Phase**:
   - Install dependencies
   - Generate Prisma client
   - Run TypeScript type checks on api, worker, web
3. **Build & Push Phase**:
   - Docker images built for web, api, worker
   - Images pushed to `ghcr.io/ddotsmedia/askvyo/{service}:{sha},{latest}`
4. **Database Migration Phase**:
   - Prisma migration runs on VPS: `pnpm db:migrate`
   - Creates/updates `NotificationSubscription` table
5. **Deploy Phase**:
   - Verifies target VPS (hostname check)
   - Copies docker-compose.prod.yml, Caddyfile, .env to VPS
   - Runs deploy.sh on VPS
   - Service Worker (`/sw.js`) deployed with web app
6. **Smoke Tests**:
   - API health check: `GET /health`
   - Web status check: `GET /`

### Local Testing Before Deployment

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
pnpm --filter @askvyo/db exec prisma generate

# 3. Run migrations (local database)
pnpm db:migrate

# 4. Create .env.local with test keys
cp .env.example .env.local

# 5. Start development servers
pnpm dev

# 6. Test in browser (DevTools → Application → Service Workers)
# - Navigate to http://localhost:3000
# - Check that sw.js is registered and active
# - Look for "Notification permission" button
```

## Verification Checklist

### Pre-Deployment (Before pushing to main)

- [ ] All feature branches merged to main
- [ ] `git push origin main` successful
- [ ] GitHub Actions workflow file exists (`.github/workflows/deploy.yml`)
- [ ] VAPID secrets added to GitHub repository settings
- [ ] `.env.example` includes VAPID variables (DONE)
- [ ] `apps/web/public/sw.js` exists with notification handler
- [ ] `apps/web/src/components/NotificationToggle.tsx` exists
- [ ] `apps/web/src/hooks/usePushNotifications.ts` exists
- [ ] `apps/api/src/notifications/notifications.service.ts` includes `setVapidDetails()`
- [ ] Database migration file exists (20261022010000_add_notification_subscriptions)

### Deployment (On VPS)

- [ ] GitHub Actions triggered on push to main
- [ ] Build phase succeeds for all services (web, api, worker)
- [ ] Docker images pushed to ghcr.io
- [ ] Prisma migration runs and `NotificationSubscription` table created
- [ ] Containers deployed and running:
  - [ ] `askvyo_web` listening on port 3022
  - [ ] `askvyo_api` listening on port 3024
  - [ ] `askvyo_worker` listening on port 3023
- [ ] Smoke tests pass (API health + web status < 500)

### Post-Deployment (Verify functionality)

**In Browser DevTools (Application Tab):**
- [ ] Service Worker registered at `/sw.js` (status: activated)
- [ ] Cache storage contains `askvyo-cache-v1` (or similar)

**In User Settings/Dashboard:**
- [ ] "Enable Push Notifications" toggle appears
- [ ] Clicking toggle shows "Allow notifications?" permission prompt
- [ ] After allowing, user subscription saved to database

**Test Notification (Admin API):**
```bash
curl -X POST https://askvyo.com/api/v1/notifications/send-test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-admin-token>" \
  -d '{
    "userId": "<test-user-id>",
    "title": "Test Notification",
    "body": "Push notifications are working!"
  }'
```

**Expected Result:**
- Browser shows notification toast/banner
- Clicking notification navigates to relevant question page
- Subscription marked as active in database

## Implementation Details

### Service Worker (`apps/web/public/sw.js`)
- Handles `push` events from notification server
- Extracts title, body, and data from event
- Shows native notification with `self.registration.showNotification()`
- Navigates to question page on notification click

### NotificationToggle Component (`apps/web/src/components/NotificationToggle.tsx`)
- Toggle switch for opt-in/opt-out
- Requests browser notification permission
- Handles subscription/unsubscription
- Shows permission status and subscription endpoint

### Notifications Service (`apps/api/src/notifications/notifications.service.ts`)
- Stores subscriptions in `NotificationSubscription` table
- Validates subscriptions (marks inactive if failed)
- Sends web push using `webpush` library with VAPID keys
- Includes notification data for deep linking

### Database Schema (`packages/db/prisma/schema.prisma`)
```prisma
model NotificationSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, endpoint])
  @@index([userId])
  @@index([isActive])
}
```

## Troubleshooting

### Service Worker not registering
1. Check `/sw.js` returns 200 status (not 404 or cached 404)
2. Verify `.next/public/sw.js` exists in build artifacts
3. Check DevTools → Network → `sw.js` for errors
4. Clear browser cache: Hard refresh (Ctrl+Shift+R on Windows/Linux)

### Permission prompt not appearing
1. Check browser console for errors: DevTools → Console
2. Verify `usePushNotifications` hook is called in component
3. Check browser permission settings (may be blocked at OS level)
4. Test in private/incognito window (no permission blocks)

### Subscription fails
1. Check NotificationToggle component for JavaScript errors
2. Verify VAPID_PUBLIC_KEY is correct in environment
3. Check API endpoint `/api/v1/notifications/subscribe` returns 200
4. Inspect network request payload in DevTools

### Push notification not received
1. Check subscription is active in database: `NotificationSubscription` table
2. Verify VAPID_PRIVATE_KEY is set on API server
3. Check API logs for push send errors
4. Test with invalid subscription to see error handling

### Database migration fails on VPS
1. Check Prisma client is generated: `pnpm --filter @askvyo/db exec prisma generate`
2. Verify database connection in PROD_ENV
3. Check for conflicting migrations
4. See VPS logs: `docker-compose -f docker-compose.prod.yml logs -f postgres`

## Rollback Plan

If issues occur after deployment:

1. **Immediate**: Revert deployment by deploying previous main commit:
   ```bash
   git revert HEAD
   git push origin main
   ```
   GitHub Actions will redeploy previous version automatically.

2. **Database**: If notification subscriptions cause issues:
   ```bash
   # SSH to VPS and run:
   pnpm db:rollback
   # Or manually drop table if critical:
   docker-compose -f docker-compose.prod.yml exec postgres \
     psql -U askvyo -d askvyo -c "DROP TABLE NotificationSubscription;"
   ```

3. **Cleanup**: Clear browser caches:
   - Clear service worker: DevTools → Application → Service Workers → Unregister
   - Clear cache: DevTools → Application → Cache Storage → Delete askvyo-cache-v1

## Next Steps

1. Add VAPID secrets to GitHub repository
2. Push a test commit to main to trigger GitHub Actions
3. Monitor GitHub Actions for build/deploy progress
4. Verify service worker and notifications on staging
5. Test with real notifications
6. Announce feature to users

## References

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/draft-thomson-webpush-protocol)
- [VAPID Specification](https://datatracker.ietf.org/doc/html/draft-thomson-webpush-vapid)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [web-push npm package](https://github.com/web-push-libs/web-push)
