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
    const receiptNo = dto.receipt_no || `INV-${Date.now().toString().slice(-6)}`;
    const date = dto.date || new Date().toISOString().split('T')[0];

    let items = dto.items;
    // If items is empty or not provided, convert single product inputs into an items array
    if (!items || items.length === 0) {
      if (dto.product_name) {
        const itemQty = dto.quantity ?? 1;
        const itemPrice = dto.unit_price ?? 0;
        const itemOrig = dto.original_price ?? itemPrice;
        let itemDiscount = dto.discount ?? 0;
        if (itemOrig > itemPrice) {
          itemDiscount = (itemOrig - itemPrice) * itemQty;
        }
        items = [
          {
            product_id: dto.product_id,
            product_name: dto.product_name,
            quantity: itemQty,
            unit_price: itemPrice,
            original_price: itemOrig,
            discount: itemDiscount,
            total_amount: itemQty * itemPrice,
          },
        ];
      } else {
        items = [];
      }
    } else {
      // Normalize each item in the items array
      items = items.map((it) => {
        const q = it.quantity ?? 1;
        const p = it.unit_price ?? 0;
        const orig = it.original_price ?? p;
        let disc = it.discount ?? 0;
        if (orig > p) {
          disc = (orig - p) * q;
        }
        return {
          ...it,
          quantity: q,
          unit_price: p,
          original_price: orig,
          discount: disc,
          total_amount: it.total_amount ?? q * p,
        };
      });
    }

    // Calculate aggregated metrics across all items
    const totalUnits = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const totalAmount = dto.total_amount ?? items.reduce((sum, it) => sum + (it.total_amount || 0), 0);
    const totalDiscount = items.reduce((sum, it) => sum + (it.discount || 0), 0);

    // Summary product name for table and legacy queries
    let summaryProductName = dto.product_name;
    if (!summaryProductName) {
      if (items.length === 0) {
        summaryProductName = 'Custom Sale';
      } else if (items.length === 1) {
        summaryProductName = items[0].product_name;
      } else {
        summaryProductName = `${items[0].product_name} (+${items.length - 1} more)`;
      }
    }

    const firstProductId =
      items.length === 1 && items[0].product_id
        ? items[0].product_id
        : dto.product_id || null;
    const avgUnitPrice = totalUnits > 0 ? totalAmount / totalUnits : dto.unit_price ?? 0;

    const created = new this.saleModel({
      ...dto,
      items,
      product_id: firstProductId,
      product_name: summaryProductName,
      quantity: totalUnits > 0 ? totalUnits : dto.quantity ?? 1,
      unit_price: avgUnitPrice,
      original_price: dto.original_price ?? avgUnitPrice,
      discount: totalDiscount,
      total_amount: totalAmount,
      receipt_no: receiptNo,
      date,
      business_id: businessId,
    });
    const saved = await created.save();

    // Deduct quantity from inventory for all items that have a product_id
    for (const item of items) {
      if (item.product_id) {
        try {
          const prodId = (item.product_id as any)?._id || (item.product_id as any);
          await this.productModel.updateOne(
            { _id: prodId, business_id: businessId },
            { $inc: { quantity: -item.quantity } },
          );
        } catch (err) {
          console.warn(`Could not update product stock level for ${item.product_id}:`, err);
        }
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

    if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
      const items = dto.items.map((it) => {
        const q = it.quantity ?? 1;
        const p = it.unit_price ?? 0;
        const orig = it.original_price ?? p;
        let disc = it.discount ?? 0;
        if (orig > p) {
          disc = (orig - p) * q;
        }
        return {
          ...it,
          quantity: q,
          unit_price: p,
          original_price: orig,
          discount: disc,
          total_amount: it.total_amount ?? q * p,
        };
      });

      const totalUnits = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
      const totalAmount = dto.total_amount ?? items.reduce((sum, it) => sum + (it.total_amount || 0), 0);
      const totalDiscount = items.reduce((sum, it) => sum + (it.discount || 0), 0);

      updateData.items = items;
      updateData.quantity = totalUnits;
      updateData.total_amount = totalAmount;
      updateData.discount = totalDiscount;
      if (!dto.product_name) {
        updateData.product_name =
          items.length === 1
            ? items[0].product_name
            : `${items[0].product_name} (+${items.length - 1} more)`;
      }
      if (totalUnits > 0) {
        updateData.unit_price = totalAmount / totalUnits;
      }
    } else if (dto.quantity !== undefined && dto.unit_price !== undefined) {
      updateData.total_amount = dto.total_amount ?? dto.quantity * dto.unit_price;
      const originalPrice = dto.original_price ?? dto.unit_price;
      if (originalPrice > dto.unit_price) {
        updateData.discount = (originalPrice - dto.unit_price) * dto.quantity;
      }
    }

    const updated = await this.saleModel
      .findOneAndUpdate({ _id: id, business_id: businessId }, { $set: updateData }, { returnDocument: 'after' })
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

    // Restore inventory quantities if products were associated
    if (deleted.items && deleted.items.length > 0) {
      for (const item of deleted.items) {
        if (item.product_id) {
          try {
            const prodId = (item.product_id as any)?._id || (item.product_id as any);
            await this.productModel.updateOne(
              { _id: prodId, business_id: businessId },
              { $inc: { quantity: item.quantity } },
            );
          } catch (err) {
            console.warn(`Could not restore product stock level for ${item.product_id}:`, err);
          }
        }
      }
    } else if (deleted.product_id) {
      try {
        const prodId = (deleted.product_id as any)?._id || (deleted.product_id as any);
        await this.productModel.updateOne(
          { _id: prodId, business_id: businessId },
          { $inc: { quantity: deleted.quantity } },
        );
      } catch (err) {
        console.warn('Could not restore product stock level:', err);
      }
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
