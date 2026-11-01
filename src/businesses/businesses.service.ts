import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Business, BusinessDocument } from './schemas/business.schema';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectModel(Business.name)
    private businessModel: Model<BusinessDocument>,
  ) {}

  async create(businessData: Partial<Business>): Promise<BusinessDocument> {
    const business = new this.businessModel(businessData);
    return business.save();
  }

  async findById(id: string | Types.ObjectId): Promise<BusinessDocument | null> {
    return this.businessModel.findById(id).populate('owner', '-password').exec();
  }

  async findByOwner(ownerId: string | Types.ObjectId): Promise<BusinessDocument[]> {
    return this.businessModel.find({ owner: ownerId }).exec();
  }

  async update(id: string | Types.ObjectId, dto: UpdateBusinessDto): Promise<BusinessDocument> {
    const updated = await this.businessModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('owner', '-password')
      .exec();
    if (!updated) {
      throw new NotFoundException('Business not found');
    }
    return updated;
  }
}
