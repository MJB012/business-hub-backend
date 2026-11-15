import {
  Controller,
  Get,
  Query,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { APP_PERMISSIONS } from '../common/constants/permissions.constant';

@Controller('reports')
@RequirePermissions(APP_PERMISSIONS.REPORTS_VIEW)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private getBusinessId(req: any): string {
    const businessId = req.user?.business?._id || req.user?.business;
    if (!businessId) {
      throw new NotFoundException('No business linked to the current user');
    }
    return businessId.toString();
  }

  @Get('summary')
  getFinancialSummary(@Request() req: any, @Query() query: ReportQueryDto) {
    const businessId = this.getBusinessId(req);
    return this.reportsService.getFinancialSummary(businessId, query);
  }

  @Get('sales')
  getSalesReport(@Request() req: any, @Query() query: ReportQueryDto) {
    const businessId = this.getBusinessId(req);
    return this.reportsService.getSalesReport(businessId, query);
  }

  @Get('expenses')
  getExpensesReport(@Request() req: any, @Query() query: ReportQueryDto) {
    const businessId = this.getBusinessId(req);
    return this.reportsService.getExpensesReport(businessId, query);
  }

  @Get('inventory')
  getInventoryReport(@Request() req: any) {
    const businessId = this.getBusinessId(req);
    return this.reportsService.getInventoryReport(businessId);
  }
}
