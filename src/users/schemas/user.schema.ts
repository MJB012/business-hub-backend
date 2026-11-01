import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Business } from '../../businesses/schemas/business.schema';
import { UserRoleEnum } from '../../enums/UserRoleEnum';

export type UserDocument = User & Document;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User {
  @Prop({ required: true, trim: true })
  full_name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: String,
    enum: UserRoleEnum,
    default: UserRoleEnum.ADMIN,
  })
  role: UserRoleEnum;

  @Prop({ type: Types.ObjectId, ref: 'Business', required: false, default: null })
  business?: Types.ObjectId | Business | null;

  @Prop({ type: String, default: null })
  reset_password_code?: string | null;

  @Prop({ type: Date, default: null })
  reset_password_expires?: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('business_name').get(function () {
  return (this.business as any)?.name;
});

UserSchema.virtual('business_type').get(function () {
  return (this.business as any)?.type;
});
