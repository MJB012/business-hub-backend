import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sale.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name)
    private saleModel: Model<SaleDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateSaleDto, businessId: string | Types.ObjectId): Promise<SaleDocument> {
    const totalAmount = dto.total_amount ?? dto.quantity * dto.unit_price;
    const receiptNo = dto.receipt_no || `INV-${Date.now().toString().slice(-6)}`;
    const date = dto.date || new Date().toISOString().split('T')[0];

    let discount = dto.discount ?? 0;
    if (dto.original_price !== undefined && dto.original_price !== null && dto.unit_price < dto.original_price) {
      discount = (dto.original_price - dto.unit_price) * dto.quantity;
    }

    const created = new this.saleModel({
      ...dto,
      original_price: dto.original_price ?? dto.unit_price,
      discount,
      total_amount: totalAmount,
      receipt_no: receiptNo,
      date,
      business_id: businessId,
    });
    const saved = await created.save();

    // Deduct quantity from inventory if product_id is associated
    if (dto.product_id) {
      try {
        await this.productModel.updateOne(
          { _id: dto.product_id, business_id: businessId },
          { $inc: { quantity: -dto.quantity } },
        );
      } catch (err) {
        console.warn('Could not update product stock level:', err);
      }
    }

    return saved;
  }

  async findAll(businessId: string | Types.ObjectId): Promise<SaleDocument[]> {
    return this.saleModel.find({ business_id: businessId }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, businessId: string | Types.ObjectId): Promise<SaleDocument> {
    const sale = await this.saleModel.findOne({ _id: id, business_id: businessId }).exec();
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }

  async update(id: string, dto: UpdateSaleDto, businessId: string | Types.ObjectId): Promise<SaleDocument> {
    const updateData: any = { ...dto };
    if (dto.quantity !== undefined && dto.unit_price !== undefined) {
      updateData.total_amount = dto.total_amount ?? dto.quantity * dto.unit_price;
      const originalPrice = dto.original_price ?? dto.unit_price;
      if (originalPrice > dto.unit_price) {
        updateData.discount = (originalPrice - dto.unit_price) * dto.quantity;
      }
    }
    const updated = await this.saleModel
      .findOneAndUpdate({ _id: id, business_id: businessId }, { $set: updateData }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Sale not found');
    }
    return updated;
  }

  async remove(id: string, businessId: string | Types.ObjectId): Promise<{ message: string }> {
    const deleted = await this.saleModel.findOneAndDelete({ _id: id, business_id: businessId }).exec();
    if (!deleted) {
      throw new NotFoundException('Sale not found');
    }
    return { message: 'Sale removed successfully' };
  }

  async getStats(businessId: string | Types.ObjectId) {
    const sales = await this.findAll(businessId);
    const todayStr = new Date().toISOString().split('T')[0];

    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const todaySales = sales.filter((s) => s.date === todayStr);
    const todayRevenue = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

    return {
      total_revenue: totalRevenue,
      today_revenue: todayRevenue,
      total_orders: sales.length,
      today_orders: todaySales.length,
    };
  }
}
