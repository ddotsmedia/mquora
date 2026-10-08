import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mquora.com' },
    update: {},
    create: {
      email: 'admin@mquora.com',
      displayName: 'Admin User',
      username: 'admin',
      role: 'ADMIN',
      isVerified: true,
      reputationScore: 1000,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'user1@mquora.com' },
    update: {},
    create: {
      email: 'user1@mquora.com',
      displayName: 'Raj Kumar',
      username: 'raj_kumar',
      role: 'USER',
      isVerified: true,
      reputationScore: 250,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'user2@mquora.com' },
    update: {},
    create: {
      email: 'user2@mquora.com',
      displayName: 'Priya Singh',
      username: 'priya_singh',
      role: 'TRUSTED_CONTRIBUTOR',
      isVerified: true,
      reputationScore: 500,
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'user3@mquora.com' },
    update: {},
    create: {
      email: 'user3@mquora.com',
      displayName: 'Ahmed Al-Mansouri',
      username: 'ahmed_mansouri',
      role: 'VERIFIED_EXPERT',
      isVerified: true,
      reputationScore: 750,
    },
  });

  const user4 = await prisma.user.upsert({
    where: { email: 'user4@mquora.com' },
    update: {},
    create: {
      email: 'user4@mquora.com',
      displayName: 'Ananya Sharma',
      username: 'ananya_sharma',
      role: 'USER',
      isVerified: false,
      reputationScore: 100,
    },
  });

  const keralaComm = await prisma.community.upsert({
    where: { slug: 'kerala' },
    update: {},
    create: {
      slug: 'kerala',
      name: 'Kerala',
      description: 'Community for Malayalam speakers in Kerala',
      isPublic: true,
      memberCount: 4,
      createdBy: adminUser.id,
    },
  });

  const uaeComm = await prisma.community.upsert({
    where: { slug: 'uae' },
    update: {},
    create: {
      slug: 'uae',
      name: 'UAE',
      description: 'Community for Malayalam speakers in UAE',
      isPublic: true,
      memberCount: 4,
      createdBy: adminUser.id,
    },
  });

  const techComm = await prisma.community.upsert({
    where: { slug: 'technology' },
    update: {},
    create: {
      slug: 'technology',
      name: 'Technology',
      description: 'Technology discussions and questions',
      isPublic: true,
      memberCount: 4,
      createdBy: adminUser.id,
    },
  });

  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: 'programming' },
      update: {},
      create: { name: 'Programming', slug: 'programming', postCount: 2 },
    }),
    prisma.tag.upsert({
      where: { slug: 'web-development' },
      update: {},
      create: { name: 'Web Development', slug: 'web-development', postCount: 1 },
    }),
    prisma.tag.upsert({
      where: { slug: 'javascript' },
      update: {},
      create: { name: 'JavaScript', slug: 'javascript', postCount: 1 },
    }),
    prisma.tag.upsert({
      where: { slug: 'database' },
      update: {},
      create: { name: 'Database', slug: 'database', postCount: 1 },
    }),
    prisma.tag.upsert({
      where: { slug: 'mobile-app' },
      update: {},
      create: { name: 'Mobile App', slug: 'mobile-app', postCount: 0 },
    }),
  ]);

  const questions = [
    {
      title: 'വെബ് സൈറ്റ് എങ്ങനെ നിർമ്മിക്കാം?',
      body: 'ഞാൻ എന്റെ ബിസിനസിനായി ഒരു വെബ് സൈറ്റ് നിർമ്മിക്കാൻ ആഗ്രഹിക്കുന്നു. എനിക്ക് എവിടെ തുടങ്ങണം?',
      language: 'MALAYALAM' as const,
      authorId: user1.id,
      communityId: keralaComm.id,
      tagIds: ['web-development'],
    },
    {
      title: 'How to learn JavaScript quickly?',
      body: 'I want to learn JavaScript for web development. What are the best resources?',
      language: 'ENGLISH' as const,
      authorId: user2.id,
      communityId: techComm.id,
      tagIds: ['javascript', 'programming'],
    },
    {
      title: 'PostgreSQL vs MongoDB - Which should I choose?',
      body: 'What are the pros and cons of PostgreSQL vs MongoDB for web applications?',
      language: 'ENGLISH' as const,
      authorId: user3.id,
      communityId: techComm.id,
      tagIds: ['database'],
    },
    {
      title: 'UAE ൽ ജോബ് എങ്ങനെ കണ്ടെത്താം?',
      body: 'UAE ൽ ഐടി ജോബ് തേടുന്നവർക്കുള്ള വിദ്യകൾ',
      language: 'MALAYALAM' as const,
      authorId: user4.id,
      communityId: uaeComm.id,
      tagIds: [],
    },
    {
      title: 'React hooks explained',
      body: 'Can someone explain React hooks and their benefits?',
      language: 'ENGLISH' as const,
      authorId: user1.id,
      communityId: techComm.id,
      tagIds: ['javascript', 'web-development'],
    },
    {
      title: 'മലയാളം പ്രോഗ്രാമിംഗ് സീരീസ്',
      body: 'മലയാളത്തിൽ ഒരു പ്രോഗ്രാമിംഗ് ചാനൽ ആരംഭിക്കാൻ ആഗ്രഹിക്കുന്നു',
      language: 'MALAYALAM' as const,
      authorId: user2.id,
      communityId: keralaComm.id,
      tagIds: ['programming'],
    },
    {
      title: 'Node.js performance optimization',
      body: 'Tips for optimizing Node.js applications for better performance',
      language: 'ENGLISH' as const,
      authorId: user3.id,
      communityId: techComm.id,
      tagIds: ['programming'],
    },
    {
      title: 'Manglish keyboard shortcuts',
      body: 'Best ways to type Manglish efficiently on mobile',
      language: 'MANGLISH' as const,
      authorId: user4.id,
      communityId: uaeComm.id,
      tagIds: [],
    },
    {
      title: 'CSS Grid vs Flexbox',
      body: 'When should I use CSS Grid and when should I use Flexbox?',
      language: 'ENGLISH' as const,
      authorId: user1.id,
      communityId: techComm.id,
      tagIds: ['web-development'],
    },
    {
      title: 'പുതിയ സ്ടാർട്ടআപ്പ് ആരംഭിക്കുമോ?',
      body: 'കൊച്ചികിൽ എൻ്റ ടെക് സ്ടാർട്ടാപ്പ് ആരംഭിക്കാൻ പരിഗണിക്കുന്നു',
      language: 'MALAYALAM' as const,
      authorId: user2.id,
      communityId: keralaComm.id,
      tagIds: [],
    },
  ];

  const createdPosts = [];
  for (const q of questions) {
    const { tagIds, ...postData } = q;
    const post = await prisma.post.create({
      data: {
        ...postData,
        type: 'QUESTION',
        seoSlug: q.title.toLowerCase().replace(/\s+/g, '-').substring(0, 50),
        originalText: q.body,
        status: 'PUBLISHED',
      },
    });
    createdPosts.push(post);

    if (tagIds.length > 0) {
      for (const tagName of tagIds) {
        const tag = tags.find((t) => t.slug === tagName);
        if (tag) {
          await prisma.postTag.create({
            data: { postId: post.id, tagId: tag.id },
          });
        }
      }
    }
  }

  const answers = [
    {
      postId: createdPosts[0].id,
      authorId: user2.id,
      body: 'HTML, CSS, JavaScript എന്നിവ പഠിക്കാൻ തുടങ്ങുക',
      originalText: 'HTML, CSS, JavaScript എന്നിവ പഠിക്കാൻ തുടങ്ങുക',
    },
    {
      postId: createdPosts[0].id,
      authorId: user3.id,
      body: 'Next.js ഉപയോഗിക്കുന്നത് നല്ലൊരു ഐഡിയ ആയിരിക്കും',
      originalText: 'Next.js ഉപയോഗിക്കുന്നത് നല്ലൊരു ഐഡിയ ആയിരിക്കും',
    },
    {
      postId: createdPosts[1].id,
      authorId: user1.id,
      body: 'Start with freeCodeCamp and Codecademy tutorials',
      originalText: 'Start with freeCodeCamp and Codecademy tutorials',
    },
    {
      postId: createdPosts[1].id,
      authorId: user3.id,
      body: 'JavaScript is easier if you know other programming languages',
      originalText: 'JavaScript is easier if you know other programming languages',
    },
    {
      postId: createdPosts[2].id,
      authorId: user2.id,
      body: 'PostgreSQL is better for structured data, MongoDB for NoSQL',
      originalText: 'PostgreSQL is better for structured data, MongoDB for NoSQL',
    },
    {
      postId: createdPosts[3].id,
      authorId: user1.id,
      body: 'LinkedIn ഉപയോഗിച്ച് നോക്കിയാലോ',
      originalText: 'LinkedIn ഉപയോഗിച്ച് നോക്കിയാലോ',
    },
    {
      postId: createdPosts[4].id,
      authorId: user2.id,
      body: 'Hooks make state management easier in functional components',
      originalText: 'Hooks make state management easier in functional components',
    },
    {
      postId: createdPosts[5].id,
      authorId: user1.id,
      body: 'YouTube പ്രാരംഭിക്കാൻ നല്ലൊരു ആരംഭമാണ്',
      originalText: 'YouTube പ്രാരംഭിക്കാൻ നല്ലൊരു ആരംഭമാണ്',
    },
    {
      postId: createdPosts[6].id,
      authorId: user1.id,
      body: 'Use clustering and load balancing for better performance',
      originalText: 'Use clustering and load balancing for better performance',
    },
    {
      postId: createdPosts[8].id,
      authorId: user2.id,
      body: 'Use Grid for 2D layouts and Flexbox for 1D layouts',
      originalText: 'Use Grid for 2D layouts and Flexbox for 1D layouts',
    },
  ];

  for (const answer of answers) {
    await prisma.answer.create({
      data: {
        ...answer,
        language: 'ENGLISH',
        originalText: answer.originalText,
        status: 'PUBLISHED',
      },
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
