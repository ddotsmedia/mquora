import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, VoteType, ReputationEventType } from '@prisma/client';

type Target = 'POST' | 'ANSWER' | 'COMMENT';

// Reputation the content AUTHOR gets for each vote type.
const REP: Record<Target, { UP: [ReputationEventType, number]; DOWN: [ReputationEventType, number] }> = {
  POST: { UP: ['POST_UPVOTED', 10], DOWN: ['POST_DOWNVOTED', -2] },
  ANSWER: { UP: ['ANSWER_UPVOTED', 15], DOWN: ['ANSWER_DOWNVOTED', -3] },
  COMMENT: { UP: ['COMMENT_UPVOTED', 5], DOWN: ['COMMENT_UPVOTED', 0] },
};

@Injectable()
export class VotesService {
  private prisma = new PrismaClient();

  private async ownerOf(targetId: string, targetType: string): Promise<string> {
    const where = { where: { id: targetId, deletedAt: null }, select: { authorId: true } };
    const row =
      targetType === 'POST' ? await this.prisma.post.findFirst(where)
      : targetType === 'ANSWER' ? await this.prisma.answer.findFirst(where)
      : targetType === 'COMMENT' ? await this.prisma.comment.findFirst(where)
      : null;
    if (!row) throw new NotFoundException('Content not found');
    return row.authorId;
  }

  private score(targetType: string, targetId: string, delta: number) {
    const args = { where: { id: targetId }, data: { voteScore: { increment: delta } } };
    if (targetType === 'POST') return this.prisma.post.update(args);
    if (targetType === 'ANSWER') return this.prisma.answer.update(args);
    return this.prisma.comment.update(args);
  }

  private rep(userId: string, targetType: Target, type: VoteType, targetId: string, sign: 1 | -1) {
    const [event, delta] = REP[targetType][type];
    if (!delta) return [];
    return [
      this.prisma.reputationEvent.create({ data: { userId, event, delta: delta * sign, sourceId: targetId } }),
      this.prisma.user.update({ where: { id: userId }, data: { reputationScore: { increment: delta * sign } } }),
    ];
  }

  async vote(voterId: string, targetId: string, targetType: string, voteType: VoteType) {
    if (!(targetType in REP)) throw new BadRequestException('Invalid target type');
    if (voteType !== 'UP' && voteType !== 'DOWN') throw new BadRequestException('Invalid vote');
    const t = targetType as Target;
    const ownerId = await this.ownerOf(targetId, t);
    if (ownerId === voterId) throw new BadRequestException('You cannot vote on your own content');

    const existing = await this.prisma.vote.findUnique({
      where: { authorId_targetId_targetType: { authorId: voterId, targetId, targetType } },
      select: { id: true, type: true },
    });
    if (existing?.type === voteType) return { id: existing.id, type: voteType }; // no change, no extra reputation

    const delta = (voteType === 'UP' ? 1 : -1) - (existing ? (existing.type === 'UP' ? 1 : -1) : 0);
    const [vote] = await this.prisma.$transaction([
      this.prisma.vote.upsert({
        where: { authorId_targetId_targetType: { authorId: voterId, targetId, targetType } },
        create: { authorId: voterId, targetId, targetType, type: voteType },
        update: { type: voteType },
        select: { id: true, type: true },
      }),
      this.score(t, targetId, delta),
      ...(existing ? this.rep(ownerId, t, existing.type, targetId, -1) : []),
      ...this.rep(ownerId, t, voteType, targetId, 1),
    ]);
    return vote;
  }

  async removeVote(voterId: string, targetId: string, targetType: string) {
    const vote = await this.prisma.vote.findUnique({
      where: { authorId_targetId_targetType: { authorId: voterId, targetId, targetType } },
    });
    if (!vote || !(targetType in REP)) return;
    const t = targetType as Target;
    const ownerId = await this.ownerOf(targetId, t).catch(() => null);

    await this.prisma.$transaction([
      this.prisma.vote.delete({ where: { authorId_targetId_targetType: { authorId: voterId, targetId, targetType } } }),
      this.score(t, targetId, vote.type === 'UP' ? -1 : 1),
      ...(ownerId ? this.rep(ownerId, t, vote.type, targetId, -1) : []),
    ]);
  }

  async mine(voterId: string, ids: string[]) {
    if (!ids.length) return { votes: {} };
    const rows = await this.prisma.vote.findMany({ where: { authorId: voterId, targetId: { in: ids } }, select: { targetId: true, type: true } });
    return { votes: Object.fromEntries(rows.map((r) => [r.targetId, r.type])) };
  }
}
