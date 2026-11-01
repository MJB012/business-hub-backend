import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Business } from '../../businesses/schemas/business.schema';
import { Product } from '../../products/schemas/product.schema';

export type SaleDocument = Sale & Document;

@Schema({ timestamps: true })
export class Sale {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: false, default: null })
  product_id?: Types.ObjectId | Product | null;

  @Prop({ required: true, trim: true })
  product_name: string;

  @Prop({ required: true, type: Number, min: 1 })
  quantity: number;

  @Prop({ required: true, type: Number, min: 0 })
  unit_price: number;

  @Prop({ type: Number, min: 0, default: 0 })
  original_price?: number;

  @Prop({ type: Number, min: 0, default: 0 })
  discount?: number;

  @Prop({ required: true, type: Number, min: 0 })
  total_amount: number;

  @Prop({ trim: true, default: 'Cash' })
  payment_method: string;

  @Prop({ trim: true, default: 'Walk-in Customer' })
  customer_name?: string;

  @Prop({ trim: true, default: '' })
  customer_phone?: string;

  @Prop({ trim: true, default: '' })
  notes?: string;

  @Prop({ trim: true, default: () => new Date().toISOString().split('T')[0] })
  date: string;

  @Prop({ trim: true, default: '' })
  receipt_no: string;

  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  business_id: Types.ObjectId | Business;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);
