import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Business } from '../../businesses/schemas/business.schema';
import { User } from '../../users/schemas/user.schema';

export type ExpenseDocument = Expense & Document;

@Schema({ timestamps: true })
export class Expense {
  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, type: Number, min: 0 })
  amount: number;

  @Prop({
    required: true,
    trim: true,
    default: () => new Date().toISOString().split('T')[0],
  })
  date: string; // Stored as YYYY-MM-DD

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ trim: true, default: 'Cash' })
  payment_method: string;

  @Prop({ trim: true, default: '' })
  vendor?: string;

  @Prop({ trim: true, default: '' })
  receipt_no?: string;

  @Prop({ trim: true, default: '' })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'Business', required: true, index: true })
  business_id: Types.ObjectId | Business;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  created_by?: Types.ObjectId | User;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

// Compound index for fast day-by-day and month-by-month queries per business
ExpenseSchema.index({ business_id: 1, date: -1 });
ExpenseSchema.index({ business_id: 1, category: 1 });
