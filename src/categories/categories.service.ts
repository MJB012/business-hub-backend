import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
  ) {}

  async create(dto: CreateCategoryDto, businessId: string | Types.ObjectId): Promise<CategoryDocument> {
    const created = new this.categoryModel({
      ...dto,
      business_id: businessId,
    });
    return created.save();
  }

  async findAll(businessId: string | Types.ObjectId): Promise<CategoryDocument[]> {
    return this.categoryModel.find({ business_id: businessId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, businessId: string | Types.ObjectId): Promise<CategoryDocument> {
    const category = await this.categoryModel.findOne({ _id: id, business_id: businessId }).exec();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, businessId: string | Types.ObjectId): Promise<CategoryDocument> {
    const updated = await this.categoryModel
      .findOneAndUpdate({ _id: id, business_id: businessId }, { $set: dto }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Category not found');
    }
    return updated;
  }

  async remove(id: string, businessId: string | Types.ObjectId): Promise<{ message: string }> {
    const deleted = await this.categoryModel.findOneAndDelete({ _id: id, business_id: businessId }).exec();
    if (!deleted) {
      throw new NotFoundException('Category not found');
    }
    return { message: 'Category removed successfully' };
  }
}
