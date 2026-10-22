export class SubscribePushDto {
  endpoint!: string;
  p256dh!: string;
  auth!: string;
}

export class UnsubscribePushDto {
  endpoint!: string;
}

export class SendTestNotificationDto {
  userId!: string;
  title!: string;
  body!: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, string>;
}

export class NotificationSubscriptionResponse {
  id!: string;
  userId!: string;
  endpoint!: string;
  isActive!: boolean;
  createdAt!: Date;
}

export class PushNotificationPayload {
  title!: string;
  body!: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, string>;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}
