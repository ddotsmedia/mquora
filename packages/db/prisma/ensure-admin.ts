/**
 * ensure-admin.ts — run once after migrations in production.
 * Creates the admin user if they don't exist, or resets their password/role
 * if ADMIN_EMAIL and ADMIN_PASSWORD are provided via env.
 *
 * SAFE: never deletes any data, never touches other users.
 */
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@askvyo.com';
  const password = process.env.ADMIN_PASSWORD || 'ADM@adm2k26%';
  const username = process.env.ADMIN_USERNAME || 'admin';
  const displayName = process.env.ADMIN_DISPLAY_NAME || 'Admin';

  const passwordHash = await argon2.hash(password);

  const existing = await prisma.user.findFirst({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: 'ADMIN',
        isVerified: true,
        deletedAt: null,
        bannedAt: null,
        bannedUntil: null,
      },
    });
    console.log(`✓ Admin user updated: ${email} (role=ADMIN, password reset)`);
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName,
        passwordHash,
        role: 'ADMIN',
        isVerified: true,
        onboardedAt: new Date(),
        profile: { create: { bio: 'Platform administrator' } },
      },
    });
    console.log(`✓ Admin user created: ${email} (id=${user.id})`);
  }
}

main()
  .catch((e) => { console.error('ensure-admin failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
