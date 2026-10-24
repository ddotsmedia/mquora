import { IsString, MinLength, MaxLength, IsOptional, ArrayMaxSize, IsIn } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(10)
  @MaxLength(300)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  body!: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  communityId?: string;

  @IsOptional()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  tags?: string[];

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: 'DRAFT' | 'PUBLISHED';
}
