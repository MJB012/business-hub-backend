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
  create(@Request() req: any, @Body() dto: CreateSaleDto) {
    const businessId = this.getBusinessId(req);
    return this.salesService.create(dto, businessId);
  }

  @Get()
  findAll(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    return this.salesService.findAll(businessId);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    return this.salesService.getStats(businessId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.salesService.findOne(id, businessId);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSaleDto,
  ) {
    const businessId = this.getBusinessId(req);
    return this.salesService.update(id, dto, businessId);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.salesService.remove(id, businessId);
  }
}
