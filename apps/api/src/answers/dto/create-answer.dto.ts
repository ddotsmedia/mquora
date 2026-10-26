import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

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
  @IsString()
  type!: 'UP' | 'DOWN';
}
