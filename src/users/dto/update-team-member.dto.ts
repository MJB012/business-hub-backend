import { IsOptional, MinLength, IsEnum, IsString, IsArray } from 'class-validator';
import { UserRoleEnum } from '../../enums/UserRoleEnum';

export class UpdateTeamMemberDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @IsOptional()
  @IsEnum(UserRoleEnum, { message: 'Invalid role specified' })
  role?: UserRoleEnum;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
