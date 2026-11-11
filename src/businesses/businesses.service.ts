import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async findByName(name: string): Promise<BusinessDocument | null> {
    if (!name || typeof name !== 'string') return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    return this.businessModel
      .findOne({ name: { $regex: new RegExp(`^${this.escapeRegex(trimmed)}$`, 'i') } })
      .collation({ locale: 'en', strength: 2 })
      .exec();
  }

  async create(businessData: Partial<Business>): Promise<BusinessDocument> {
    if (businessData.name) {
      const existing = await this.findByName(businessData.name);
      if (existing) {
        throw new ConflictException('A business with this name already exists');
      }
    }

    try {
      const business = new this.businessModel(businessData);
      return await business.save();
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('A business with this name already exists');
      }
      throw err;
    }
  }

  async findById(id: string | Types.ObjectId): Promise<BusinessDocument | null> {
    return this.businessModel.findById(id).populate('owner', '-password').exec();
  }

  async findByOwner(ownerId: string | Types.ObjectId): Promise<BusinessDocument[]> {
    return this.businessModel.find({ owner: ownerId }).exec();
  }

  async update(id: string | Types.ObjectId, dto: UpdateBusinessDto): Promise<BusinessDocument> {
    if (dto.name) {
      const existing = await this.findByName(dto.name);
      if (existing && existing._id.toString() !== id.toString()) {
        throw new ConflictException('A business with this name already exists');
      }
    }

    try {
      const updated = await this.businessModel
        .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after', runValidators: true })
        .populate('owner', '-password')
        .exec();
      if (!updated) {
        throw new NotFoundException('Business not found');
      }
      return updated;
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('A business with this name already exists');
      }
      throw err;
    }
  }
}
