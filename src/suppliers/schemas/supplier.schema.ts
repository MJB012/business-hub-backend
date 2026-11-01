import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Business } from '../../businesses/schemas/business.schema';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true, default: '' })
  contact_person: string;

  @Prop({ trim: true, default: '' })
  email: string;

  @Prop({ trim: true, default: '' })
  phone: string;

  @Prop({ trim: true, default: '' })
  address: string;

  @Prop({ trim: true, default: '' })
  notes: string;

  @Prop({ type: Number, default: 0 })
  products_count: number;

  @Prop({ type: String, enum: ['active', 'inactive'], default: 'active' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Business', required: true })
  business_id: Types.ObjectId | Business;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
