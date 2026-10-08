import { IsString, MinLength, MaxLength, IsOptional, ArrayMaxSize } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(20)
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
}
