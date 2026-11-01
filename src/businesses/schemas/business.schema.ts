import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type BusinessDocument = Business & Document;

@Schema({ timestamps: true })
export class Business {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  owner?: Types.ObjectId | User;

  @Prop({ type: String, default: null })
  logo?: string | null;

  @Prop({ type: String, trim: true, default: '' })
  contact_email?: string;

  @Prop({ type: String, trim: true, default: '' })
  contact_phone?: string;

  @Prop({ type: String, default: 'USD ($)' })
  currency?: string;

  @Prop({ type: String, trim: true, default: '' })
  address?: string;

  @Prop({ type: Number, default: 10 })
  low_stock_threshold?: number;

  @Prop({ type: String, enum: ['active', 'blocked'], default: 'active' })
  status: string;

  @Prop({ type: Date, default: null })
  blocked_at?: Date | null;

  @Prop({ type: String, default: '' })
  block_reason?: string;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);
