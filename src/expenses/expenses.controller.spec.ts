import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let service: ExpensesService;

  const mockBusinessId = 'biz_12345';
  const mockUserId = 'user_12345';
  const mockExpenseId = 'exp_12345';

  const mockReq = {
    user: {
      _id: mockUserId,
      business: { _id: mockBusinessId },
    },
  };

  const mockExpense = {
    _id: mockExpenseId,
    description: 'Electricity Bill',
    amount: 250,
    category: 'Utilities',
    business_id: mockBusinessId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        {
          provide: ExpensesService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockExpense),
            findAll: jest.fn().mockResolvedValue([mockExpense]),
            findOne: jest.fn().mockResolvedValue(mockExpense),
            update: jest.fn().mockResolvedValue({ ...mockExpense, amount: 280 }),
            remove: jest.fn().mockResolvedValue({ message: 'Expense removed successfully' }),
            getStats: jest.fn().mockResolvedValue({
              total_expenses: 250,
              monthly_expenses: 250,
              today_expenses: 0,
              entries_count: 1,
              average_expense: 250,
              largest_expense: 250,
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ExpensesController>(ExpensesController);
    service = module.get<ExpensesService>(ExpensesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an expense using user business', async () => {
      const dto = {
        description: 'Electricity Bill',
        amount: 250,
        category: 'Utilities',
      };
      const result = await controller.create(mockReq, dto);
      expect(result).toEqual(mockExpense);
      expect(service.create).toHaveBeenCalledWith(dto, mockBusinessId, mockUserId);
    });

    it('should throw NotFoundException if user has no business', () => {
      expect(() => controller.create({ user: {} }, { description: 'X', amount: 10, category: 'Y' })).toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return list of expenses', async () => {
      const result = await controller.findAll(mockReq, undefined, undefined, 'Utilities');
      expect(result).toEqual([mockExpense]);
      expect(service.findAll).toHaveBeenCalledWith(mockBusinessId, {
        startDate: undefined,
        endDate: undefined,
        category: 'Utilities',
        payment_method: undefined,
        search: undefined,
      });
    });
  });

  describe('getStats', () => {
    it('should return stats for current business', async () => {
      const result = await controller.getStats(mockReq);
      expect(result).toHaveProperty('total_expenses', 250);
      expect(service.getStats).toHaveBeenCalledWith(mockBusinessId);
    });
  });

  describe('findOne', () => {
    it('should return a single expense', async () => {
      const result = await controller.findOne(mockReq, mockExpenseId);
      expect(result).toEqual(mockExpense);
      expect(service.findOne).toHaveBeenCalledWith(mockExpenseId, mockBusinessId);
    });
  });

  describe('update', () => {
    it('should update an expense', async () => {
      const result = await controller.update(mockReq, mockExpenseId, { amount: 280 });
      expect(result.amount).toBe(280);
      expect(service.update).toHaveBeenCalledWith(mockExpenseId, { amount: 280 }, mockBusinessId);
    });
  });

  describe('remove', () => {
    it('should delete an expense', async () => {
      const result = await controller.remove(mockReq, mockExpenseId);
      expect(result).toEqual({ message: 'Expense removed successfully' });
      expect(service.remove).toHaveBeenCalledWith(mockExpenseId, mockBusinessId);
    });
  });
});
