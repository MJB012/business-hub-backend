import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ExpensesService } from './expenses.service';
import { Expense } from './schemas/expense.schema';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let mockModel: any;

  const mockBusinessId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();
  const mockExpenseId = new Types.ObjectId().toString();

  const mockExpenseDoc = {
    _id: mockExpenseId,
    description: 'Office Internet',
    amount: 120,
    date: '2026-11-01',
    category: 'Internet & Telephone',
    payment_method: 'Bank Transfer',
    vendor: 'ISP Co',
    receipt_no: 'INV-001',
    notes: 'November subscription',
    business_id: mockBusinessId,
    created_by: mockUserId,
    save: jest.fn().mockResolvedValue({
      _id: mockExpenseId,
      description: 'Office Internet',
      amount: 120,
      date: '2026-11-01',
      category: 'Internet & Telephone',
      payment_method: 'Bank Transfer',
      vendor: 'ISP Co',
      receipt_no: 'INV-001',
      notes: 'November subscription',
      business_id: mockBusinessId,
      created_by: mockUserId,
    }),
  };

  beforeEach(async () => {
    function MockExpenseModel(dto: any) {
      return {
        ...dto,
        save: jest.fn().mockResolvedValue({
          _id: mockExpenseId,
          ...dto,
        }),
      };
    }

    MockExpenseModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockExpenseDoc]),
      }),
      exec: jest.fn().mockResolvedValue([mockExpenseDoc]),
    });

    MockExpenseModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockExpenseDoc),
    });

    MockExpenseModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        ...mockExpenseDoc,
        amount: 150,
      }),
    });

    MockExpenseModel.findOneAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockExpenseDoc),
    });

    mockModel = MockExpenseModel;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        {
          provide: getModelToken(Expense.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return an expense', async () => {
      const dto = {
        description: 'Office Supplies',
        amount: 80,
        date: '2026-11-02',
        category: 'Office Supplies',
      };

      const result = await service.create(dto, mockBusinessId, mockUserId);
      expect(result).toBeDefined();
      expect(result.description).toBe('Office Supplies');
      expect(result.amount).toBe(80);
      expect(result.business_id).toBe(mockBusinessId);
    });
  });

  describe('findAll', () => {
    it('should return an array of expenses', async () => {
      const result = await service.findAll(mockBusinessId);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ business_id: mockBusinessId }),
      );
    });

    it('should filter by category and search term', async () => {
      await service.findAll(mockBusinessId, {
        category: 'Internet & Telephone',
        search: 'Office',
      });
      expect(mockModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          business_id: mockBusinessId,
          category: 'Internet & Telephone',
          $or: expect.any(Array),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should find one expense by id', async () => {
      const result = await service.findOne(mockExpenseId, mockBusinessId);
      expect(result).toBeDefined();
      expect(result._id).toBe(mockExpenseId);
    });

    it('should throw NotFoundException if id is invalid', async () => {
      await expect(service.findOne('invalid-id', mockBusinessId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if not found', async () => {
      mockModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(mockExpenseId, mockBusinessId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an existing expense', async () => {
      const result = await service.update(
        mockExpenseId,
        { amount: 150 },
        mockBusinessId,
      );
      expect(result).toBeDefined();
      expect(result.amount).toBe(150);
    });

    it('should throw NotFoundException when updating non-existent expense', async () => {
      mockModel.findOneAndUpdate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update(mockExpenseId, { amount: 200 }, mockBusinessId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an expense', async () => {
      const result = await service.remove(mockExpenseId, mockBusinessId);
      expect(result).toEqual({ message: 'Expense removed successfully' });
    });

    it('should throw NotFoundException if expense to remove does not exist', async () => {
      mockModel.findOneAndDelete.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(mockExpenseId, mockBusinessId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return computed statistics', async () => {
      const stats = await service.getStats(mockBusinessId);
      expect(stats).toBeDefined();
      expect(stats.total_expenses).toBe(120);
      expect(stats.entries_count).toBe(1);
      expect(stats.average_expense).toBe(120);
      expect(stats.largest_expense).toBe(120);
      expect(Array.isArray(stats.category_breakdown)).toBe(true);
    });
  });
});
