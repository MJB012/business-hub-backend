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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  RequirePermissions,
  RequireAnyPermissions,
} from '../common/decorators/permissions.decorator';
import { APP_PERMISSIONS } from '../common/constants/permissions.constant';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  private getBusinessId(req: any): string {
    const businessId = req.user?.business?._id || req.user?.business;
    if (!businessId) {
      throw new NotFoundException('No business linked to the current user');
    }
    return businessId;
  }

  @Post()
  @RequirePermissions(APP_PERMISSIONS.CATEGORIES_MANAGE)
  create(@Request() req: any, @Body() dto: CreateCategoryDto) {
    const businessId = this.getBusinessId(req);
    return this.categoriesService.create(dto, businessId);
  }

  @Get()
  @RequireAnyPermissions(
    APP_PERMISSIONS.CATEGORIES_MANAGE,
    APP_PERMISSIONS.INVENTORY_VIEW,
    APP_PERMISSIONS.SALES_VIEW,
  )
  findAll(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    return this.categoriesService.findAll(businessId);
  }

  @Get(':id')
  @RequireAnyPermissions(
    APP_PERMISSIONS.CATEGORIES_MANAGE,
    APP_PERMISSIONS.INVENTORY_VIEW,
    APP_PERMISSIONS.SALES_VIEW,
  )
  findOne(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.categoriesService.findOne(id, businessId);
  }

  @Patch(':id')
  @RequirePermissions(APP_PERMISSIONS.CATEGORIES_MANAGE)
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const businessId = this.getBusinessId(req);
    return this.categoriesService.update(id, dto, businessId);
  }

  @Delete(':id')
  @RequirePermissions(APP_PERMISSIONS.CATEGORIES_MANAGE)
  remove(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.categoriesService.remove(id, businessId);
  }
}
