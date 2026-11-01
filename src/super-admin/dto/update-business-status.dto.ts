import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateBusinessStatusDto {
  @IsNotEmpty()
  @IsIn(['active', 'blocked'])
  status: 'active' | 'blocked';

  @IsOptional()
  @IsString()
  reason?: string;
}
