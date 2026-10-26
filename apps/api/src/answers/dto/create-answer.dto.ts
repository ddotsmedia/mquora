import { IsString, MinLength, MaxLength, IsOptional, IsIn } from 'class-validator';

export class CreateAnswerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50000)
  body!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class VoteAnswerDto {
  @IsIn(['UP', 'DOWN'])
  type!: 'UP' | 'DOWN';
}
