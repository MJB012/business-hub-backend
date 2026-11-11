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
  create(@Request() req: any, @Body() dto: CreateExpenseDto) {
    const businessId = this.getBusinessId(req);
    const userId = req.user?._id;
    return this.expensesService.create(dto, businessId, userId);
  }

  @Get()
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
  getStats(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    return this.expensesService.getStats(businessId);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.expensesService.findOne(id, businessId);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    const businessId = this.getBusinessId(req);
    return this.expensesService.update(id, dto, businessId);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    const businessId = this.getBusinessId(req);
    return this.expensesService.remove(id, businessId);
  }
}
