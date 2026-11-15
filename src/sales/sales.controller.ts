import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { APP_PERMISSIONS } from '../common/constants/permissions.constant';

@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  private getBusinessId(req: any): string {
    const businessId = req.user?.business?._id || req.user?.business;
    if (!businessId) {
      throw new NotFoundException('No business linked to the current user');
    }
    return businessId;
  }

  @Post()
  @RequirePermissions(APP_PERMISSIONS.SALES_CREATE)
  create(@Request() req: any, @Body() dto: CreateSaleDto) {
    const businessId = this.getBusinessId(req);
    return this.salesService.create(dto, businessId);
  }

  @Get()
  @RequirePermissions(APP_PERMISSIONS.SALES_VIEW)
  findAll(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    return this.salesService.findAll(businessId);
  }

  @Get('stats')
  @RequirePermissions(APP_PERMISSIONS.SALES_VIEW)
  getStats(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    return this.salesService.getStats(businessId);
  }

  @Get(':id')
  @RequirePermissions(APP_PERMISSIONS.SALES_VIEW)
  findOne(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.salesService.findOne(id, businessId);
  }

  @Patch(':id')
  @RequirePermissions(APP_PERMISSIONS.SALES_EDIT)
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSaleDto,
  ) {
    const businessId = this.getBusinessId(req);
    return this.salesService.update(id, dto, businessId);
  }

  @Delete(':id')
  @RequirePermissions(APP_PERMISSIONS.SALES_DELETE)
  remove(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.salesService.remove(id, businessId);
  }
}
