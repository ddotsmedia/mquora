import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data for re-seeding
  await prisma.$transaction([
    prisma.vote.deleteMany({}),
    prisma.answer.deleteMany({}),
    prisma.postTag.deleteMany({}),
    prisma.post.deleteMany({}),
    prisma.communityMember.deleteMany({}),
    prisma.community.deleteMany({}),
    prisma.tag.deleteMany({}),
    prisma.reputationEvent.deleteMany({}),
    prisma.userBadge.deleteMany({}),
    prisma.badge.deleteMany({}),
    prisma.bookmark.deleteMany({}),
    prisma.follow.deleteMany({}),
    prisma.report.deleteMany({}),
    prisma.moderationLog.deleteMany({}),
    prisma.notification.deleteMany({}),
    prisma.auditLog.deleteMany({}),
    prisma.session.deleteMany({}),
    prisma.identity.deleteMany({}),
    prisma.userProfile.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);

  // Create admin user
  const adminHash = await argon2.hash('admin123');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@mquora.com',
      username: 'admin',
      displayName: 'Admin',
      passwordHash: adminHash,
      role: 'ADMIN',
      reputationScore: 1000,
      isVerified: true,
      profile: {
        create: {
          bio: 'Platform administrator',
        },
      },
    },
  });

  // Create regular users for authors
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const hash = await argon2.hash(`user${i}123`);
    const user = await prisma.user.create({
      data: {
        email: `user${i}@mquora.com`,
        username: `user${i}`,
        displayName: `User ${i}`,
        passwordHash: hash,
        role: 'USER',
        reputationScore: 100 * i,
        profile: {
          create: {
            bio: `Bio for user ${i}`,
          },
        },
      },
    });
    users.push(user);
  }

  // Create communities
  const communities = await Promise.all([
    prisma.community.create({
      data: {
        slug: 'kerala-tech',
        name: 'Kerala Tech',
        description: 'കേരളത്തിലെ സാങ്കേതികവിദ്യ',
        createdBy: adminUser.id,
      },
    }),
    prisma.community.create({
      data: {
        slug: 'malayalam-literature',
        name: 'Malayalam Literature',
        description: 'മലയാള സാഹിത്യം',
        createdBy: adminUser.id,
      },
    }),
    prisma.community.create({
      data: {
        slug: 'ayurveda-qa',
        name: 'Ayurveda Q&A',
        description: 'ആയുർവേദ ചോദ്യോത്തരങ്ങൾ',
        createdBy: adminUser.id,
      },
    }),
    prisma.community.create({
      data: {
        slug: 'uae-malayalees',
        name: 'UAE Malayalees',
        description: 'UAE-ലെ മലയാളി സമൂഹം',
        createdBy: adminUser.id,
      },
    }),
    prisma.community.create({
      data: {
        slug: 'tech-english',
        name: 'Tech in English',
        description: 'Technology discussions',
        createdBy: adminUser.id,
      },
    }),
    prisma.community.create({
      data: {
        slug: 'startup-kerala',
        name: 'Startup Kerala',
        description: 'Startup ecosystem Kerala',
        createdBy: adminUser.id,
      },
    }),
    prisma.community.create({
      data: {
        slug: 'cooking-kerala',
        name: 'Kerala Cooking',
        description: 'Kerala cuisine & recipes',
        createdBy: adminUser.id,
      },
    }),
    prisma.community.create({
      data: {
        slug: 'education',
        name: 'Education',
        description: 'വിദ്യാഭ്യാസ ചർച്ചകൾ',
        createdBy: adminUser.id,
      },
    }),
    prisma.community.create({
      data: {
        slug: 'jobs-uae',
        name: 'Jobs UAE',
        description: 'UAE job discussions',
        createdBy: adminUser.id,
      },
    }),
    prisma.community.create({
      data: {
        slug: 'health-wellness',
        name: 'Health & Wellness',
        description: 'ആരോഗ്യം',
        createdBy: adminUser.id,
      },
    }),
  ]);

  // Create tags
  const tagNames = ['javascript', 'python', 'react', 'nextjs', 'nodejs', 'ayurveda', 'kerala', 'uae', 'cooking', 'education', 'startup', 'health', 'technology', 'malayalam', 'literature'];
  const tags = await Promise.all(
    tagNames.map(name =>
      prisma.tag.create({
        data: {
          name,
          slug: name.toLowerCase(),
        },
      }),
    ),
  );

  // Create sample posts with answers and votes
  const posts = [
    {
      title: 'Next.js 15 ൽ Server Actions എങ്ങനെ ഉപയോഗിക്കാം?',
      body: 'Next.js 15-ൽ server actions പ്രയോഗിക്കുന്നത് കുറിച്ച് എനിക്ക് വിശദ വിവരം വേണ്ടതായിരിക്കുന്നു. ഞാൻ സർവർ-സൈഡ്ഡ പ്രോസെസിങ്ങ് നടത്തണ്ടതായിരിക്കുന്നു എന്നാൽ എങ്ങനെ എന്നത് സ്ഥിരമായിരിക്കുന്നു.',
      community: communities[0],
      tags: [tags[3], tags[4]],
      language: 'MALAYALAM',
      author: users[0],
    },
    {
      title: 'Manglish adipoli: React hooks enthu cheyyan?',
      body: 'React hooks use cheyyan saadhyam aanu. Njan useState and useEffect use cheyyum... Ithre start cheyyav... Ninte code better aavaan suggestions?',
      community: communities[0],
      tags: [tags[2], tags[4]],
      language: 'MANGLISH',
      author: users[1],
    },
    {
      title: 'How to start learning Ayurveda basics?',
      body: 'I am interested in learning the fundamentals of Ayurveda. What are the best resources and practices to begin with? Are there any recommended books or courses for beginners?',
      community: communities[2],
      tags: [tags[5], tags[11]],
      language: 'ENGLISH',
      author: users[2],
    },
    {
      title: 'UAE-ൽ job കിട്ടാൻ എന്തൊക്കെ ചെയ്യണം?',
      body: 'ഞാൻ UAE-ൽ ജോലി കിട്ടാൻ ആഗ്രഹിക്കുന്നു. CV എങ്ങനെ തയ്യാരാക്കണം, ഇന്റർവ്യൂ നടത്താൻ എന്നത് പഠിക്കാൻ എന്ത് വഴികൾ ഉണ്ട്?',
      community: communities[8],
      tags: [tags[7]],
      language: 'MIXED',
      author: users[3],
    },
    {
      title: 'Kerala sadhya recipe — oru complete guide',
      body: 'Kerala sadhya recipe ne patti complete guide share cheyyoo... Njan sadhya prepare cheyyaan aanu... Ingredients list and step-by-step preparation method share cheyyoo please!',
      community: communities[6],
      tags: [tags[6], tags[8]],
      language: 'MANGLISH',
      author: users[4],
    },
  ];

  const createdPosts = await Promise.all(
    posts.map(post => {
      const seoSlug = `${post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').slice(0, 50)}-${Date.now()}`;
      return prisma.post.create({
        data: {
          title: post.title,
          body: post.body,
          originalText: post.body,
          language: post.language,
          authorId: post.author.id,
          communityId: post.community.id,
          seoSlug,
          status: 'PUBLISHED',
          tags: {
            create: post.tags.map(tag => ({
              tagId: tag.id,
            })),
          },
        },
        include: { tags: true },
      });
    }),
  );

  // Create answers and votes for each post
  for (let postIdx = 0; postIdx < createdPosts.length; postIdx++) {
    const post = createdPosts[postIdx];
    const answerAuthor = users[(postIdx + 1) % users.length];

    // Create 2 answers per post
    for (let i = 0; i < 2; i++) {
      const answer = await prisma.answer.create({
        data: {
          postId: post.id,
          authorId: answerAuthor.id,
          body: `This is answer ${i + 1} to the question. It provides helpful information.`,
          originalText: `This is answer ${i + 1} to the question. It provides helpful information.`,
          language: 'ENGLISH',
          status: 'PUBLISHED',
        },
      });

      // Create reputation event for answer
      await prisma.reputationEvent.create({
        data: {
          userId: answerAuthor.id,
          event: 'ANSWER_UPVOTED',
          delta: 10,
          sourceId: answer.id,
        },
      });
    }

    // Create 3 upvotes per post from admin
    for (let i = 0; i < 3; i++) {
      const voter = i === 0 ? adminUser : users[i % users.length];
      await prisma.vote.create({
        data: {
          authorId: voter.id,
          targetId: post.id,
          targetType: 'post',
          type: 'UP',
        },
      });

      // Create reputation event for upvote
      await prisma.reputationEvent.create({
        data: {
          userId: post.author.id,
          event: 'POST_UPVOTED',
          delta: 1,
          sourceId: post.id,
        },
      });
    }

    // Update post vote score
    await prisma.post.update({
      where: { id: post.id },
      data: {
        voteScore: 3,
        answerCount: 2,
      },
    });
  }

  console.log('✓ Seed completed successfully');
  console.log(`✓ Created 1 admin + 5 users`);
  console.log(`✓ Created 10 communities`);
  console.log(`✓ Created 15 tags`);
  console.log(`✓ Created 5 posts with 2 answers + 3 votes each`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
