import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async create(userData: Partial<User>): Promise<UserDocument> {
    const createdUser = new this.userModel(userData);
    return createdUser.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).populate('business').exec();
  }

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).populate('business').exec();
  }

  async findAllByBusiness(businessId: string | Types.ObjectId): Promise<UserDocument[]> {
    const bId = typeof businessId === 'string' ? new Types.ObjectId(businessId) : businessId;
    return this.userModel
      .find({ business: bId })
      .select('-password')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(query: any): Promise<UserDocument | null> {
    return this.userModel.findOne(query).exec();
  }

  async count(query: any = {}): Promise<number> {
    return this.userModel.countDocuments(query).exec();
  }

  async update(id: string | Types.ObjectId, updateData: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after' }).exec();
  }

  async remove(id: string | Types.ObjectId): Promise<any> {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
