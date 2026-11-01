import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Business } from '../../businesses/schemas/business.schema';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '' })
  description: string;

  @Prop({ type: Number, default: 0 })
  products_count: number;

  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  business_id: Types.ObjectId | Business;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
