import { Controller, Get, Patch, Body, Request, NotFoundException } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { UserRoleEnum } from '../enums/UserRoleEnum';

@Controller('businesses')
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Get('current')
  async getCurrentBusiness(@Request() req: any) {
    const businessId = req.user?.business?._id || req.user?.business;
    if (!businessId) {
      throw new NotFoundException('No business linked to the current user');
    }
    return this.businessesService.findById(businessId);
  }

  @Patch('current')
  async updateCurrentBusiness(@Request() req: any, @Body() dto: UpdateBusinessDto) {
    const businessId = req.user?.business?._id || req.user?.business;
    if (!businessId) {
      throw new NotFoundException('No business linked to the current user');
    }

    // Only SUPER_ADMIN can change the business type
    const userRole = req.user?.role;
    if (dto.type && userRole !== UserRoleEnum.SUPER_ADMIN) {
      delete dto.type;
    }

    return this.businessesService.update(businessId, dto);
  }
}
