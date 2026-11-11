import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateBusinessStatusDto {
  @IsNotEmpty()
  @IsIn(['active', 'blocked', 'suspended', 'pending', 'inactive'])
  status: 'active' | 'blocked' | 'suspended' | 'pending' | 'inactive';

  @IsOptional()
  @IsString()
  reason?: string;
}
