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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  RequirePermissions,
  RequireAnyPermissions,
} from '../common/decorators/permissions.decorator';
import { APP_PERMISSIONS } from '../common/constants/permissions.constant';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  private getBusinessId(req: any): string {
    const businessId = req.user?.business?._id || req.user?.business;
    if (!businessId) {
      throw new NotFoundException('No business linked to the current user');
    }
    return businessId;
  }

  @Post()
  @RequirePermissions(APP_PERMISSIONS.INVENTORY_MANAGE)
  create(@Request() req: any, @Body() dto: CreateProductDto) {
    const businessId = this.getBusinessId(req);
    return this.productsService.create(dto, businessId);
  }

  @Get()
  @RequireAnyPermissions(
    APP_PERMISSIONS.INVENTORY_VIEW,
    APP_PERMISSIONS.SALES_VIEW,
    APP_PERMISSIONS.SALES_CREATE,
  )
  findAll(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    return this.productsService.findAll(businessId);
  }

  @Get(':id')
  @RequireAnyPermissions(
    APP_PERMISSIONS.INVENTORY_VIEW,
    APP_PERMISSIONS.SALES_VIEW,
    APP_PERMISSIONS.SALES_CREATE,
  )
  findOne(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.productsService.findOne(id, businessId);
  }

  @Patch(':id')
  @RequirePermissions(APP_PERMISSIONS.INVENTORY_MANAGE)
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const businessId = this.getBusinessId(req);
    return this.productsService.update(id, dto, businessId);
  }

  @Delete(':id')
  @RequirePermissions(APP_PERMISSIONS.INVENTORY_DELETE)
  remove(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.productsService.remove(id, businessId);
  }
}
