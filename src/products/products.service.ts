import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateProductDto, businessId: string | Types.ObjectId): Promise<ProductDocument> {
    const created = new this.productModel({
      ...dto,
      business_id: businessId,
    });
    return created.save();
  }

  async findAll(businessId: string | Types.ObjectId): Promise<ProductDocument[]> {
    return this.productModel.find({ business_id: businessId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, businessId: string | Types.ObjectId): Promise<ProductDocument> {
    const product = await this.productModel.findOne({ _id: id, business_id: businessId }).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, businessId: string | Types.ObjectId): Promise<ProductDocument> {
    const updated = await this.productModel
      .findOneAndUpdate({ _id: id, business_id: businessId }, { $set: dto }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Product not found');
    }
    return updated;
  }

  async remove(id: string, businessId: string | Types.ObjectId): Promise<{ message: string }> {
    const deleted = await this.productModel.findOneAndDelete({ _id: id, business_id: businessId }).exec();
    if (!deleted) {
      throw new NotFoundException('Product not found');
    }
    return { message: 'Product removed successfully' };
  }
}
