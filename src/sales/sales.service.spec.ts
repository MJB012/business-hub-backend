import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SalesService } from './sales.service';
import { Sale } from './schemas/sale.schema';
import { Product } from '../products/schemas/product.schema';

describe('SalesService', () => {
  let service: SalesService;
  let mockSaleModel: any;
  let mockProductModel: any;

  const mockBusinessId = new Types.ObjectId().toString();

  beforeEach(async () => {
    mockSaleModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({
        ...dto,
        _id: new Types.ObjectId(),
      }),
    }));

    mockSaleModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });

    mockSaleModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    mockSaleModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    mockSaleModel.findOneAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    mockProductModel = {
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getModelToken(Sale.name), useValue: mockSaleModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create multi-product sale', () => {
    it('should aggregate multiple items into a single sale and deduct inventory for each product', async () => {
      const prodId1 = new Types.ObjectId().toString();
      const prodId2 = new Types.ObjectId().toString();

      const dto = {
        items: [
          {
            product_id: prodId1,
            product_name: 'Product A',
            quantity: 2,
            unit_price: 50,
            original_price: 60,
          },
          {
            product_id: prodId2,
            product_name: 'Product B',
            quantity: 3,
            unit_price: 30,
            original_price: 30,
          },
          {
            product_name: 'Custom Service',
            quantity: 1,
            unit_price: 20,
          },
        ],
        payment_method: 'Cash',
        customer_name: 'John Doe',
      };

      const result = await service.create(dto as any, mockBusinessId);

      // Verify aggregation
      expect(result.items).toHaveLength(3);
      expect(result.quantity).toBe(6); // 2 + 3 + 1 = 6
      expect(result.total_amount).toBe(210); // (2*50) + (3*30) + (1*20) = 100 + 90 + 20 = 210
      expect(result.discount).toBe(20); // Product A has (60 - 50) * 2 = 20 discount
      expect(result.product_name).toBe('Product A (+2 more)');

      // Verify stock deductions for products with product_id
      expect(mockProductModel.updateOne).toHaveBeenCalledWith(
        { _id: prodId1, business_id: mockBusinessId },
        { $inc: { quantity: -2 } },
      );
      expect(mockProductModel.updateOne).toHaveBeenCalledWith(
        { _id: prodId2, business_id: mockBusinessId },
        { $inc: { quantity: -3 } },
      );
    });

    it('should support legacy single product input', async () => {
      const prodId = new Types.ObjectId().toString();
      const dto = {
        product_id: prodId,
        product_name: 'Single Item',
        quantity: 2,
        unit_price: 45,
        original_price: 50,
        payment_method: 'Card',
      };

      const result = await service.create(dto as any, mockBusinessId);

      expect(result.items).toHaveLength(1);
      expect(result.quantity).toBe(2);
      expect(result.total_amount).toBe(90);
      expect(result.discount).toBe(10); // (50 - 45) * 2 = 10
      expect(result.product_name).toBe('Single Item');

      expect(mockProductModel.updateOne).toHaveBeenCalledWith(
        { _id: prodId, business_id: mockBusinessId },
        { $inc: { quantity: -2 } },
      );
    });
  });
});
