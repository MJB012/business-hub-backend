import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from './schemas/expense.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

export interface ExpenseQueryFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  payment_method?: string;
  search?: string;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name)
    private expenseModel: Model<ExpenseDocument>,
  ) {}

  async create(
    dto: CreateExpenseDto,
    businessId: string | Types.ObjectId,
    userId?: string | Types.ObjectId,
  ): Promise<ExpenseDocument> {
    const date = dto.date || new Date().toISOString().split('T')[0];

    const created = new this.expenseModel({
      ...dto,
      date,
      business_id: businessId,
      created_by: userId,
    });

    return created.save();
  }

  async findAll(
    businessId: string | Types.ObjectId,
    query?: ExpenseQueryFilters,
  ): Promise<ExpenseDocument[]> {
    const filter: Record<string, any> = { business_id: businessId };

    if (query?.category && query.category !== 'all') {
      filter.category = query.category;
    }

    if (query?.payment_method && query.payment_method !== 'all') {
      filter.payment_method = query.payment_method;
    }

    if (query?.startDate || query?.endDate) {
      filter.date = {};
      if (query.startDate) {
        filter.date.$gte = query.startDate;
      }
      if (query.endDate) {
        filter.date.$lte = query.endDate;
      }
    }

    if (query?.search && query.search.trim()) {
      const escapedSearch = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'i');
      filter.$or = [
        { description: regex },
        { vendor: regex },
        { receipt_no: regex },
        { category: regex },
        { notes: regex },
      ];
    }

    return this.expenseModel
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .exec();
  }

  async findOne(
    id: string,
    businessId: string | Types.ObjectId,
  ): Promise<ExpenseDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Expense not found');
    }

    const expense = await this.expenseModel
      .findOne({ _id: id, business_id: businessId })
      .exec();

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(
    id: string,
    dto: UpdateExpenseDto,
    businessId: string | Types.ObjectId,
  ): Promise<ExpenseDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Expense not found');
    }

    const updated = await this.expenseModel
      .findOneAndUpdate(
        { _id: id, business_id: businessId },
        { $set: dto },
        { returnDocument: 'after' },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Expense not found');
    }

    return updated;
  }

  async remove(
    id: string,
    businessId: string | Types.ObjectId,
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Expense not found');
    }

    const deleted = await this.expenseModel
      .findOneAndDelete({ _id: id, business_id: businessId })
      .exec();

    if (!deleted) {
      throw new NotFoundException('Expense not found');
    }

    return { message: 'Expense removed successfully' };
  }

  async getStats(businessId: string | Types.ObjectId) {
    const expenses = await this.expenseModel
      .find({ business_id: businessId })
      .exec();

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.slice(0, 7); // "YYYY-MM"

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0,
    );
    const todayExpenses = expenses
      .filter((e) => e.date === todayStr)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const monthlyExpenses = expenses
      .filter((e) => e.date && e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const count = expenses.length;
    const largestExpense =
      count > 0 ? Math.max(...expenses.map((e) => Number(e.amount) || 0)) : 0;
    const averageExpense = count > 0 ? totalExpenses / count : 0;

    // Category breakdown
    const categoryMap: Record<string, number> = {};
    for (const exp of expenses) {
      const cat = exp.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + (Number(exp.amount) || 0);
    }

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      total_expenses: totalExpenses,
      monthly_expenses: monthlyExpenses,
      today_expenses: todayExpenses,
      entries_count: count,
      average_expense: averageExpense,
      largest_expense: largestExpense,
      top_category: categoryBreakdown[0] || null,
      category_breakdown: categoryBreakdown,
    };
  }
}
