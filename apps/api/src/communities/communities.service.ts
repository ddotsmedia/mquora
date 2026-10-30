import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import slug from 'slug';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

  // Member counts change only when membership actually changes (idempotent join/leave).
  async join(communityId: string, userId: string) {
    const community = await this.prisma.community.findFirst({ where: { id: communityId, deletedAt: null }, select: { id: true, isPublic: true } });
    if (!community) throw new NotFoundException('Community not found');
    if (!community.isPublic) throw new ForbiddenException('This community is private. Join with an invite link.');
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.communityMember.findUnique({ where: { communityId_userId: { communityId, userId } }, select: { id: true } });
      if (existing) return { joined: true };
      await tx.communityMember.create({ data: { communityId, userId, role: 'MEMBER' } });
      await tx.community.update({ where: { id: communityId }, data: { memberCount: { increment: 1 } } });
      return { joined: true };
    });
  }

  async leave(communityId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.communityMember.deleteMany({ where: { communityId, userId } });
      if (count) await tx.community.update({ where: { id: communityId }, data: { memberCount: { decrement: count } } });
      return { joined: false };
    });
  }

  async myMemberships(userId: string) {
    const rows = await this.prisma.communityMember.findMany({ where: { userId }, select: { communityId: true } });
    return { communityIds: rows.map((r) => r.communityId) };
  }

  async update(id: string, dto: Record<string, unknown>, userId: string) {
    const community = await this.prisma.community.findUnique({
      where: { id },
      select: { createdBy: true },
    });

    if (!community || (community.createdBy !== userId && !(await this.isAdmin(userId)))) {
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

  // Only existing members can invite. Invites expire after 7 days.
  async createInvite(communityId: string, userId: string) {
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Only members can invite');

    const token = randomBytes(16).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await this.prisma.communityInvite.create({
      data: { communityId, token, createdBy: userId, expiresAt },
    });
    return { token, expiresAt };
  }

  // Active (not revoked, not expired) invite links. Members only.
  async listInvites(communityId: string, userId: string) {
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('Only members can view invites');
    const rows = await this.prisma.communityInvite.findMany({
      where: { communityId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, token: true, expiresAt: true, uses: true, maxUses: true, createdBy: true, creator: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { data: rows.map((r) => ({ id: r.id, token: r.token, expiresAt: r.expiresAt, uses: r.uses, maxUses: r.maxUses, createdBy: r.createdBy, creatorUsername: r.creator.username })) };
  }

  // The link's creator, the community creator, or an admin can revoke it.
  async revokeInvite(communityId: string, inviteId: string, userId: string) {
    const { canManage } = await this.loadActor(communityId, userId);
    const invite = await this.prisma.communityInvite.findFirst({
      where: { id: inviteId, communityId },
      select: { id: true, createdBy: true, revokedAt: true },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.createdBy !== userId && !canManage) throw new ForbiddenException('Not allowed to revoke this invite');
    if (!invite.revokedAt) await this.prisma.communityInvite.update({ where: { id: inviteId }, data: { revokedAt: new Date() } });
    return { revoked: true };
  }

  // Public preview: safe fields only, no membership info.
  async previewInvite(token: string) {
    const invite = await this.prisma.communityInvite.findUnique({
      where: { token },
      select: {
        expiresAt: true,
        revokedAt: true,
        uses: true,
        maxUses: true,
        community: { select: { slug: true, name: true, description: true, memberCount: true, deletedAt: true } },
      },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    const valid = this.isInviteUsable(invite) && !invite.community.deletedAt;
    return {
      valid,
      community: { slug: invite.community.slug, name: invite.community.name, description: invite.community.description, memberCount: invite.community.memberCount },
    };
  }

  // Accepting an invite joins the community even when it is private.
  async acceptInvite(token: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.communityInvite.findUnique({
        where: { token },
        select: { id: true, communityId: true, expiresAt: true, revokedAt: true, uses: true, maxUses: true, community: { select: { slug: true, deletedAt: true } } },
      });
      if (!invite || invite.community.deletedAt) throw new NotFoundException('Invite not found');
      if (!this.isInviteUsable(invite)) throw new BadRequestException('Invite is expired or no longer valid');

      const existing = await tx.communityMember.findUnique({
        where: { communityId_userId: { communityId: invite.communityId, userId } },
        select: { id: true },
      });
      if (existing) return { joined: true, slug: invite.community.slug };

      await tx.communityMember.create({ data: { communityId: invite.communityId, userId, role: 'MEMBER' } });
      await tx.community.update({ where: { id: invite.communityId }, data: { memberCount: { increment: 1 } } });
      await tx.communityInvite.update({ where: { id: invite.id }, data: { uses: { increment: 1 } } });
      return { joined: true, slug: invite.community.slug };
    });
  }

  private isInviteUsable(invite: { expiresAt: Date; revokedAt: Date | null; uses: number; maxUses: number | null }): boolean {
    if (invite.revokedAt) return false;
    if (invite.expiresAt.getTime() <= Date.now()) return false;
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) return false;
    return true;
  }

  async listMembers(communityId: string) {
    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { createdBy: true },
    });
    if (!community) throw new NotFoundException('Community not found');
    const rows = await this.prisma.communityMember.findMany({
      where: { communityId },
      select: { role: true, joinedAt: true, user: { select: { id: true, username: true, displayName: true } } },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      take: 200,
    });
    return {
      creatorId: community.createdBy,
      data: rows.map((r) => ({ role: r.role, joinedAt: r.joinedAt, user: r.user })),
    };
  }

  // Creator and site admins manage moderators; moderators may remove plain members.
  async myRole(communityId: string, userId: string) {
    const { community, membership, canManage } = await this.loadActor(communityId, userId);
    return {
      role: membership?.role ?? null,
      isCreator: community.createdBy === userId,
      canManage,
    };
  }

  async setMemberRole(communityId: string, targetUserId: string, role: string, actorId: string) {
    if (role !== 'MODERATOR' && role !== 'MEMBER') throw new BadRequestException('Role must be MODERATOR or MEMBER');
    const { community, canManage } = await this.loadActor(communityId, actorId);
    if (!canManage) throw new ForbiddenException('Only the creator or an admin can change roles');
    if (community.createdBy === targetUserId) throw new BadRequestException('The creator’s role cannot be changed');

    const target = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: targetUserId } },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Member not found');

    await this.prisma.communityMember.update({ where: { id: target.id }, data: { role } });
    return { userId: targetUserId, role };
  }

  async removeMember(communityId: string, targetUserId: string, actorId: string) {
    if (targetUserId === actorId) return this.leave(communityId, actorId);

    const { community, membership, canManage } = await this.loadActor(communityId, actorId);
    if (community.createdBy === targetUserId) throw new BadRequestException('The creator cannot be removed');
    const target = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: targetUserId } },
      select: { role: true },
    });
    if (!target) throw new NotFoundException('Member not found');

    const moderatorRemovingMember = membership?.role === 'MODERATOR' && target.role === 'MEMBER';
    if (!canManage && !moderatorRemovingMember) throw new ForbiddenException('Not allowed to remove this member');

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.communityMember.deleteMany({ where: { communityId, userId: targetUserId } });
      if (count) await tx.community.update({ where: { id: communityId }, data: { memberCount: { decrement: count } } });
      return { removed: true };
    });
  }

  private async loadActor(communityId: string, userId: string) {
    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { id: true, createdBy: true },
    });
    if (!community) throw new NotFoundException('Community not found');
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { role: true },
    });
    const canManage = community.createdBy === userId || (await this.isAdmin(userId));
    return { community, membership, canManage };
  }

  private async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  }
}
