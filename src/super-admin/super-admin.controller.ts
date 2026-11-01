import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@Controller('super-admin')
@UseGuards(SuperAdminGuard)
export class SuperAdminController {
  constructor(private superAdminService: SuperAdminService) {}

  @Get('stats')
  getStats() {
    return this.superAdminService.getPlatformStats();
  }

  @Get('businesses')
  getBusinesses() {
    return this.superAdminService.getAllBusinessesWithStats();
  }

  @Get('businesses/:id')
  getBusinessDetails(@Param('id') id: string): Promise<any> {
    return this.superAdminService.getBusinessDetails(id);
  }

  @Patch('businesses/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessStatusDto,
  ) {
    return this.superAdminService.updateBusinessStatus(id, dto);
  }
}
