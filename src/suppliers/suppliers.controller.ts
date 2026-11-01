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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  private getBusinessId(req: any): string {
    const businessId = req.user?.business?._id || req.user?.business;
    if (!businessId) {
      throw new NotFoundException('No business linked to the current user');
    }
    return businessId;
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateSupplierDto) {
    const businessId = this.getBusinessId(req);
    return this.suppliersService.create(dto, businessId);
  }

  @Get()
  findAll(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    return this.suppliersService.findAll(businessId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.suppliersService.findOne(id, businessId);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    const businessId = this.getBusinessId(req);
    return this.suppliersService.update(id, dto, businessId);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.suppliersService.remove(id, businessId);
  }
}
