-- Admin alert when members report content to moderators.
ALTER TYPE "AdminNotifType" ADD VALUE IF NOT EXISTS 'CONTENT_REPORT';
