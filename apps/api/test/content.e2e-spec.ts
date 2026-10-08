import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Content Modules (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let communityId: string;
  let postId: string;
  let answerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test1234',
        displayName: 'Test User',
        username: 'testuser',
      });

    accessToken = registerRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Communities', () => {
    it('should create community', () => {
      return request(app.getHttpServer())
        .post('/api/v1/communities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test Community', description: 'A test community', isPublic: true })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.slug).toBe('test-community');
          communityId = res.body.id;
        });
    });

    it('should find community by slug', () => {
      return request(app.getHttpServer())
        .get('/api/v1/communities/test-community')
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Test Community');
        });
    });

    it('should join community', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/communities/${communityId}/join`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });
  });

  describe('Posts with Language Detection', () => {
    it('should create Malayalam post', () => {
      return request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'മലയാളത്തിലെ ശേഷം കഥ',
          body: 'ഇതൊരു മലയാളം പോസ്റ്റാണ് കൃത്യമായ പരീക്ഷണത്തിന് വേണ്ടി',
          type: 'QUESTION',
          communityId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('seoSlug');
          postId = res.body.id;
        });
    });

    it('should detect Manglish language', () => {
      return request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'njan adipoli',
          body: 'oru nalla sadhya aano ith, undo ith pakshe, engane nokkanam ethu',
          type: 'QUESTION',
          communityId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.language).toBe('MANGLISH');
        });
    });
  });

  describe('Answers', () => {
    it('should create answer', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/posts/${postId}/answers`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ body: 'This is a detailed answer to the question' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          answerId = res.body.id;
        });
    });

    it('should accept answer', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/answers/${answerId}/accept`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Votes', () => {
    it('should upvote post', () => {
      return request(app.getHttpServer())
        .post('/api/v1/votes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ targetId: postId, targetType: 'POST', voteType: 'UP' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
        });
    });

    it('should downvote post', () => {
      return request(app.getHttpServer())
        .post('/api/v1/votes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ targetId: postId, targetType: 'POST', voteType: 'DOWN' })
        .expect(201);
    });
  });

  describe('Bookmarks', () => {
    it('should bookmark post', () => {
      return request(app.getHttpServer())
        .post('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ postId })
        .expect(201);
    });

    it('should get user bookmarks', () => {
      return request(app.getHttpServer())
        .get('/api/v1/bookmarks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });

  describe('Language Detection Unit Tests', () => {
    it('should detect Malayalam', async () => {
      const text = 'നരേന്ദ്രമോദി പ്രധാനമന്ത്രിയാണ്';
      const response = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: text,
          body: text,
          type: 'QUESTION',
          communityId,
        });

      expect(response.body.language).toBe('MALAYALAM');
    });

    it('should detect Manglish', async () => {
      const text = 'njan oru nalla manushyan anu ennu sammatham';
      const response = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: text,
          body: text,
          type: 'QUESTION',
          communityId,
        });

      expect(response.body.language).toBe('MANGLISH');
    });

    it('should detect English', async () => {
      const text = 'Hello world, this is an English sentence';
      const response = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: text,
          body: text,
          type: 'QUESTION',
          communityId,
        });

      expect(response.body.language).toBe('ENGLISH');
    });
  });
});
