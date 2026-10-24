import { IsOptional, IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { IsNotEmpty } from 'class-validator';

export class UpdateMeDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) displayName?: string;
  @IsOptional() @IsString() @MaxLength(80) credential?: string;
  @IsOptional() @IsString() @MaxLength(500) bio?: string;
  @IsOptional() @IsString() @MaxLength(100) location?: string;
  // Empty string clears the website.
  @IsOptional() @IsString() @MaxLength(200)
  @ValidateIf((o: UpdateMeDto) => !!o.website)
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  website?: string;
}

export class ChangePasswordDto {
  @IsNotEmpty() @IsString() currentPassword: string = '';
  @IsNotEmpty() @IsString() @MinLength(8) @MaxLength(72) newPassword: string = '';
}
