/**
 * fix-admin-approval.mjs — Emergency fix for admin account approval status.
 * Sets isApproved=true and role=ADMIN for the admin email without requiring a password reset.
 * Run inside the api container: node packages/db/prisma/fix-admin-approval.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@askvyo.com';

  const user = await prisma.user.findFirst({ where: { email } });

  if (!user) {
    console.error(`✗ No user found with email: ${email}`);
    console.error('  Create the admin account first via ensure-admin.mjs');
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'ADMIN',
      isVerified: true,
      isApproved: true,
      deletedAt: null,
      bannedAt: null,
      bannedUntil: null,
    },
  });

  console.log(`✓ Admin approved: ${email} (id=${user.id})`);
  console.log(`  role=ADMIN, isApproved=true, isVerified=true`);
}

main()
  .catch((e) => { console.error('fix-admin-approval failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
