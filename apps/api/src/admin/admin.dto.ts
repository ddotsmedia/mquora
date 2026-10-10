import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ContentStatus, UserRole } from '@prisma/client';

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}

export class UsersQueryDto extends PageQueryDto {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
}

export class ContentQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(['all', 'flagged']) filter?: 'all' | 'flagged';
  @IsOptional() @IsEnum(ContentStatus) status?: ContentStatus;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}

export class ReportsQueryDto extends PageQueryDto {
  @IsOptional() @IsIn(['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'ALL']) status?: string;
}

export class AuditQueryDto extends PageQueryDto {
  @IsOptional() @IsString() @MaxLength(60) action?: string;
}

export class DaysQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(7) @Max(90) days?: number = 30;
}

export class BanDto {
  // 0 = permanent
  @IsInt() @Min(0) @Max(3650) days!: number;
}

export class RoleDto {
  @IsEnum(UserRole) role!: UserRole;
}

export class FlagDto {
  @IsString() @Matches(/^[a-z0-9_.-]{1,64}$/) key!: string;
  @IsBoolean() enabled!: boolean;
}

export class ResolveDto {
  @IsIn(['DISMISS', 'REMOVE', 'WARN']) action!: 'DISMISS' | 'REMOVE' | 'WARN';
}
