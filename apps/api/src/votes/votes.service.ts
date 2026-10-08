import { Injectable } from '@nestjs/common';
import { PrismaClient, VoteType } from '@prisma/client';

@Injectable()
export class VotesService {
  private prisma = new PrismaClient();

  async vote(authorId: string, targetId: string, targetType: string, voteType: VoteType) {
    const existing = await this.prisma.vote.findUnique({
      where: { authorId_targetId_targetType: { authorId, targetId, targetType } },
      select: { id: true, type: true },
    });

    const scoreDelta = voteType === 'UP' ? 1 : -1;
    const previousDelta = existing && existing.type === 'UP' ? 1 : existing && existing.type === 'DOWN' ? -1 : 0;
    const delta = scoreDelta - previousDelta;

    const repDelta = voteType === 'UP' ? 10 : -2;

    const vote = await this.prisma.vote.upsert({
      where: { authorId_targetId_targetType: { authorId, targetId, targetType } },
      create: { authorId, targetId, targetType, type: voteType },
      update: { type: voteType },
      select: { id: true },
    });

    if (targetType === 'POST') {
      await this.prisma.post.update({
        where: { id: targetId },
        data: { voteScore: { increment: delta } },
      });
    } else if (targetType === 'ANSWER') {
      await this.prisma.answer.update({
        where: { id: targetId },
        data: { voteScore: { increment: delta } },
      });
    } else if (targetType === 'COMMENT') {
      await this.prisma.comment.update({
        where: { id: targetId },
        data: { voteScore: { increment: delta } },
      });
    }

    await this.prisma.reputationEvent.create({
      data: {
        userId: authorId,
        delta: voteType === 'UP' ? repDelta : -repDelta,
        reason: `VOTE_${voteType}`,
      },
    });

    return vote;
  }

  async removeVote(authorId: string, targetId: string, targetType: string) {
    const vote = await this.prisma.vote.findUnique({
      where: { authorId_targetId_targetType: { authorId, targetId, targetType } },
    });

    if (!vote) return;

    const scoreDelta = vote.type === 'UP' ? -1 : 1;

    await this.prisma.vote.delete({
      where: { authorId_targetId_targetType: { authorId, targetId, targetType } },
    });

    if (targetType === 'POST') {
      await this.prisma.post.update({
        where: { id: targetId },
        data: { voteScore: { increment: scoreDelta } },
      });
    } else if (targetType === 'ANSWER') {
      await this.prisma.answer.update({
        where: { id: targetId },
        data: { voteScore: { increment: scoreDelta } },
      });
    } else if (targetType === 'COMMENT') {
      await this.prisma.comment.update({
        where: { id: targetId },
        data: { voteScore: { increment: scoreDelta } },
      });
    }
  }
}
