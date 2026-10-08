import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import slug from 'slug';

@Injectable()
export class CommunitiesService {
  private prisma = new PrismaClient();

  async create(dto: Record<string, unknown>, userId: string) {
    const { name, description, isPublic } = dto;
    const communitySlug = slug(name as string, { lower: true });

    const community = await this.prisma.community.create({
      data: {
        slug: communitySlug,
        name: name as string,
        description: description as string,
        isPublic: (isPublic as boolean) ?? true,
        createdBy: userId,
        members: { create: { userId, role: 'MODERATOR' } },
      },
      select: { id: true, slug: true, name: true, description: true, isPublic: true, createdBy: true },
    });

    return community;
  }

  async findAll(cursor?: string, limit = 20) {
    const whereClause = cursor ? { createdAt: { lt: new Date(cursor) } } : {};

    const communities = await this.prisma.community.findMany({
      where: { ...whereClause, deletedAt: null },
      select: { id: true, slug: true, name: true, description: true, isPublic: true, memberCount: true, postCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = communities.length > limit;
    const data = communities.slice(0, limit);
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null;

    return { data, nextCursor };
  }

  async findBySlug(communitySlug: string) {
    const community = await this.prisma.community.findUnique({
      where: { slug: communitySlug },
      select: { id: true, slug: true, name: true, description: true, isPublic: true, memberCount: true, postCount: true, createdBy: true, createdAt: true, deletedAt: true },
    });

    if (!community || community.deletedAt) throw new NotFoundException('Community not found');
    return community;
  }

  async join(communityId: string, userId: string) {
    return this.prisma.communityMember.upsert({
      where: { communityId_userId: { communityId, userId } },
      create: { communityId, userId, role: 'MEMBER' },
      update: {},
      select: { id: true },
    });
  }

  async leave(communityId: string, userId: string) {
    await this.prisma.communityMember.delete({
      where: { communityId_userId: { communityId, userId } },
    });

    await this.prisma.community.update({
      where: { id: communityId },
      data: { memberCount: { decrement: 1 } },
    });
  }

  async update(id: string, dto: Record<string, unknown>, userId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      select: { createdBy: true },
    });

    if (!community || (community.createdBy !== userId && (await this.isAdmin(userId)))) {
      throw new BadRequestException('Not authorized');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isPublic !== undefined) updateData.isPublic = dto.isPublic;

    return this.prisma.community.update({
      where: { id },
      data: updateData,
      select: { id: true, slug: true, name: true },
    });
  }

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  }
}
