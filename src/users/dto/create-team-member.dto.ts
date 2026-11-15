import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional, IsArray, IsString } from 'class-validator';
import { UserRoleEnum } from '../../enums/UserRoleEnum';

export class CreateTeamMemberDto {
  @IsNotEmpty({ message: 'Full name is required' })
  full_name: string;

  @IsEmail({}, { message: 'A valid email address is required' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsEnum(UserRoleEnum, { message: 'Invalid role specified' })
  role: UserRoleEnum;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
