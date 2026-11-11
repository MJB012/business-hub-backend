import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  const mockBusinessId = 'biz_999';
  const mockReq = {
    user: {
      business: { _id: mockBusinessId },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: {
            getFinancialSummary: jest.fn().mockResolvedValue({ total_revenue: 500, net_profit: 300 }),
            getSalesReport: jest.fn().mockResolvedValue({ total_revenue: 500 }),
            getExpensesReport: jest.fn().mockResolvedValue({ total_expenses: 200 }),
            getInventoryReport: jest.fn().mockResolvedValue({ total_inventory_valuation: 1500 }),
          },
        },
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get financial summary', async () => {
    const res = await controller.getFinancialSummary(mockReq, { startDate: '2026-11-01' });
    expect(res).toHaveProperty('total_revenue', 500);
    expect(service.getFinancialSummary).toHaveBeenCalledWith(mockBusinessId, { startDate: '2026-11-01' });
  });

  it('should get sales report', async () => {
    const res = await controller.getSalesReport(mockReq, {});
    expect(res).toHaveProperty('total_revenue', 500);
    expect(service.getSalesReport).toHaveBeenCalledWith(mockBusinessId, {});
  });

  it('should get expenses report', async () => {
    const res = await controller.getExpensesReport(mockReq, {});
    expect(res).toHaveProperty('total_expenses', 200);
    expect(service.getExpensesReport).toHaveBeenCalledWith(mockBusinessId, {});
  });

  it('should get inventory report', async () => {
    const res = await controller.getInventoryReport(mockReq);
    expect(res).toHaveProperty('total_inventory_valuation', 1500);
    expect(service.getInventoryReport).toHaveBeenCalledWith(mockBusinessId);
  });

  it('should throw NotFoundException if user has no business', () => {
    expect(() => controller.getInventoryReport({ user: {} })).toThrow(NotFoundException);
  });
});
