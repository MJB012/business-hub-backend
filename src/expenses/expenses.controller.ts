import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { APP_PERMISSIONS } from '../common/constants/permissions.constant';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  private getBusinessId(req: any): string {
    const businessId = req.user?.business?._id || req.user?.business;
    if (!businessId) {
      throw new NotFoundException('No business linked to the current user');
    }
    return businessId.toString();
  }

  @Post()
  @RequirePermissions(APP_PERMISSIONS.EXPENSES_MANAGE)
  create(@Request() req: any, @Body() dto: CreateExpenseDto) {
    const businessId = this.getBusinessId(req);
    const userId = req.user?._id;
    return this.expensesService.create(dto, businessId, userId);
  }

  @Get()
  @RequirePermissions(APP_PERMISSIONS.EXPENSES_VIEW)
  findAll(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('payment_method') payment_method?: string,
    @Query('search') search?: string,
  ) {
    const businessId = this.getBusinessId(req);
    return this.expensesService.findAll(businessId, {
      startDate,
      endDate,
      category,
      payment_method,
      search,
    });
  }

  @Get('stats')
  @RequirePermissions(APP_PERMISSIONS.EXPENSES_VIEW)
  getStats(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    return this.expensesService.getStats(businessId);
  }

  @Get(':id')
  @RequirePermissions(APP_PERMISSIONS.EXPENSES_VIEW)
  findOne(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.expensesService.findOne(id, businessId);
  }

  @Patch(':id')
  @RequirePermissions(APP_PERMISSIONS.EXPENSES_MANAGE)
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const businessId = this.getBusinessId(req);
    return this.expensesService.update(id, dto, businessId);
  }

  @Delete(':id')
  @RequirePermissions(APP_PERMISSIONS.EXPENSES_DELETE)
  remove(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.expensesService.remove(id, businessId);
  }
}
