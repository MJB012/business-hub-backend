import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Business } from '../../businesses/schemas/business.schema';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  sku: string;

  @Prop({ default: 'single', trim: true })
  product_type: string;

  @Prop({ required: true, trim: true })
  category: string;

  @Prop({ required: true, type: Number })
  price: number;

  @Prop({ required: true, type: Number, default: 0 })
  quantity: number;

  @Prop({ trim: true, default: '' })
  supplier?: string;

  @Prop({ trim: true, default: '' })
  description?: string;

  @Prop({ type: Number, default: null })
  low_stock_threshold?: number;

  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  business_id: Types.ObjectId | Business;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
