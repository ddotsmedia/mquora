import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function initAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@admin.com';
  const password = process.env.ADMIN_PASSWORD;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'Admin';

  if (!password) {
    console.log('[init-admin] Skipping admin creation: ADMIN_PASSWORD not set');
    process.exit(0);
  }

  try {
    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (existing && existing.role === UserRole.ADMIN) {
      console.log(`[init-admin] Admin ${email} already exists`);
      process.exit(0);
    }

    // Hash password with argon2 (matches auth.service.ts)
    const passwordHash = await argon2.hash(password);

    let user;
    if (existing) {
      // Update existing user to admin
      user = await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: UserRole.ADMIN,
          displayName,
          isVerified: true,
        },
        include: { profile: true },
      });
      console.log(`[init-admin] Updated ${email} to ADMIN role`);
    } else {
      // Create new admin user
      user = await prisma.user.create({
        data: {
          email,
          username,
          displayName,
          passwordHash,
          role: UserRole.ADMIN,
          isVerified: true,
          profile: {
            create: {
              bio: 'Platform administrator',
            },
          },
        },
        include: { profile: true },
      });
      console.log(`[init-admin] Created admin ${email}`);
    }

    // Verify password
    const isValid = await argon2.verify(user.passwordHash!, password);
    if (!isValid) {
      throw new Error('Password verification failed');
    }

    console.log('[init-admin] Admin account ready');
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[init-admin] Error: ${message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initAdmin();
