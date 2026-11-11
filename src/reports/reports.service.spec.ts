import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ReportsService } from './reports.service';
import { Sale } from '../sales/schemas/sale.schema';
import { Expense } from '../expenses/schemas/expense.schema';
import { Product } from '../products/schemas/product.schema';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockBusinessId = new Types.ObjectId().toString();

  const mockSales = [
    {
      _id: new Types.ObjectId(),
      product_name: 'Product A',
      quantity: 2,
      unit_price: 50,
      total_amount: 100,
      discount: 0,
      payment_method: 'Cash',
      customer_name: 'Customer 1',
      date: '2026-11-01',
      business_id: new Types.ObjectId(mockBusinessId),
    },
    {
      _id: new Types.ObjectId(),
      product_name: 'Product B',
      quantity: 1,
      unit_price: 80,
      total_amount: 80,
      discount: 10,
      payment_method: 'Card',
      customer_name: 'Customer 2',
      date: '2026-11-02',
      business_id: new Types.ObjectId(mockBusinessId),
    },
  ];

  const mockExpenses = [
    {
      _id: new Types.ObjectId(),
      description: 'Electricity',
      amount: 40,
      category: 'Utilities',
      payment_method: 'Bank Transfer',
      vendor: 'Electric Co',
      date: '2026-11-01',
      business_id: new Types.ObjectId(mockBusinessId),
    },
  ];

  const mockProducts = [
    {
      _id: new Types.ObjectId(),
      name: 'Product A',
      sku: 'SKU-A',
      category: 'Electronics',
      price: 50,
      quantity: 15,
      low_stock_threshold: 10,
      business_id: new Types.ObjectId(mockBusinessId),
    },
    {
      _id: new Types.ObjectId(),
      name: 'Product B',
      sku: 'SKU-B',
      category: 'Electronics',
      price: 80,
      quantity: 4,
      low_stock_threshold: 10,
      business_id: new Types.ObjectId(mockBusinessId),
    },
    {
      _id: new Types.ObjectId(),
      name: 'Product C',
      sku: 'SKU-C',
      category: 'Accessories',
      price: 20,
      quantity: 0,
      low_stock_threshold: 5,
      business_id: new Types.ObjectId(mockBusinessId),
    },
  ];

  beforeEach(async () => {
    const mockSaleModel: any = {
      aggregate: jest.fn().mockImplementation((pipeline: any[]) => {
        // Return summary or daily aggregation based on pipeline
        if (pipeline[1]?.$group?.total_revenue) {
          return Promise.resolve([
            {
              total_revenue: 180,
              total_orders: 2,
              total_units: 3,
              total_discount: 10,
            },
          ]);
        }
        if (pipeline[1]?.$group?._id) {
          return Promise.resolve([
            { _id: '2026-11-01', revenue: 100, orders: 1, units: 2 },
            { _id: '2026-11-02', revenue: 80, orders: 1, units: 1 },
          ]);
        }
        return Promise.resolve([]);
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockSales),
        }),
      }),
    };

    const mockExpenseModel: any = {
      aggregate: jest.fn().mockImplementation((pipeline: any[]) => {
        if (pipeline[1]?.$group?.total_expenses) {
          return Promise.resolve([
            {
              total_expenses: 40,
              total_entries: 1,
            },
          ]);
        }
        if (pipeline[1]?.$group?._id) {
          return Promise.resolve([
            { _id: '2026-11-01', expenses: 40, count: 1 },
          ]);
        }
        return Promise.resolve([]);
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockExpenses),
        }),
      }),
    };

    const mockProductModel: any = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockProducts),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getModelToken(Sale.name), useValue: mockSaleModel },
        { provide: getModelToken(Expense.name), useValue: mockExpenseModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFinancialSummary', () => {
    it('should aggregate revenue, expenses, and net profit', async () => {
      const result = await service.getFinancialSummary(mockBusinessId);
      expect(result.total_revenue).toBe(180);
      expect(result.total_expenses).toBe(40);
      expect(result.net_profit).toBe(140);
      expect(result.net_profit_margin).toBeCloseTo((140 / 180) * 100, 1);
      expect(result.total_orders).toBe(2);
      expect(Array.isArray(result.daily_timeline)).toBe(true);
      expect(result.daily_timeline.length).toBe(2);
    });
  });

  describe('getSalesReport', () => {
    it('should calculate sales metrics, top products and payment methods', async () => {
      const result = await service.getSalesReport(mockBusinessId);
      expect(result.total_revenue).toBe(180);
      expect(result.total_units).toBe(3);
      expect(result.total_orders).toBe(2);
      expect(result.top_products.length).toBe(2);
      expect(result.top_products[0].name).toBe('Product A');
      expect(result.payment_methods.length).toBe(2);
    });
  });

  describe('getExpensesReport', () => {
    it('should calculate expenses metrics and breakdown', async () => {
      const result = await service.getExpensesReport(mockBusinessId);
      expect(result.total_expenses).toBe(40);
      expect(result.entries_count).toBe(1);
      expect(result.categories[0].category).toBe('Utilities');
      expect(result.top_vendors[0].vendor).toBe('Electric Co');
    });
  });

  describe('getInventoryReport', () => {
    it('should calculate stock levels, valuation, and identify low/out of stock products', async () => {
      const result = await service.getInventoryReport(mockBusinessId);
      expect(result.total_products).toBe(3);
      expect(result.total_stock_quantity).toBe(19);
      // Product A: 15 * 50 = 750, Product B: 4 * 80 = 320, Product C: 0 * 20 = 0 -> Total = 1070
      expect(result.total_inventory_valuation).toBe(1070);
      expect(result.health_summary.in_stock).toBe(1);
      expect(result.health_summary.low_stock).toBe(1);
      expect(result.health_summary.out_of_stock).toBe(1);
      expect(result.low_stock_alerts.length).toBe(2);
      expect(result.low_stock_alerts[0].name).toBe('Product C'); // Out of stock first
    });
  });
});
