import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supplier, SupplierDocument } from './schemas/supplier.schema';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name)
    private supplierModel: Model<SupplierDocument>,
  ) {}

  async create(dto: CreateSupplierDto, businessId: string | Types.ObjectId): Promise<SupplierDocument> {
    const created = new this.supplierModel({
      ...dto,
      business_id: businessId,
    });
    return created.save();
  }

  async findAll(businessId: string | Types.ObjectId): Promise<SupplierDocument[]> {
    return this.supplierModel.find({ business_id: businessId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, businessId: string | Types.ObjectId): Promise<SupplierDocument> {
    const supplier = await this.supplierModel.findOne({ _id: id, business_id: businessId }).exec();
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto, businessId: string | Types.ObjectId): Promise<SupplierDocument> {
    const updated = await this.supplierModel
      .findOneAndUpdate({ _id: id, business_id: businessId }, { $set: dto }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Supplier not found');
    }
    return updated;
  }

  async remove(id: string, businessId: string | Types.ObjectId): Promise<{ message: string }> {
    const deleted = await this.supplierModel.findOneAndDelete({ _id: id, business_id: businessId }).exec();
    if (!deleted) {
      throw new NotFoundException('Supplier not found');
    }
    return { message: 'Supplier removed successfully' };
  }
}
