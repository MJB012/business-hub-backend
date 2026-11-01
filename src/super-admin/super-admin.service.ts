import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Business, BusinessDocument } from '../businesses/schemas/business.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(Business.name)
    private businessModel: Model<BusinessDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(Sale.name)
    private saleModel: Model<SaleDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async getPlatformStats() {
    const totalBusinesses = await this.businessModel.countDocuments();
    const activeBusinesses = await this.businessModel.countDocuments({
      status: { $ne: 'blocked' },
    });
    const blockedBusinesses = await this.businessModel.countDocuments({
      status: 'blocked',
    });
    const totalProducts = await this.productModel.countDocuments();
    const totalOrders = await this.saleModel.countDocuments();

    const revenueResult = await this.saleModel.aggregate([
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    return {
      total_businesses: totalBusinesses,
      active_businesses: activeBusinesses,
      blocked_businesses: blockedBusinesses,
      total_products: totalProducts,
      total_orders: totalOrders,
      total_revenue: totalRevenue,
    };
  }

  async getAllBusinessesWithStats() {
    const businesses = await this.businessModel
      .find()
      .populate('owner', 'full_name email role')
      .sort({ createdAt: -1 })
      .exec();

    // Aggregate products count by business_id
    const productCounts = await this.productModel.aggregate([
      { $group: { _id: '$business_id', count: { $sum: 1 } } },
    ]);
    const productMap = new Map<string, number>();
    productCounts.forEach((p) => {
      if (p._id) productMap.set(p._id.toString(), p.count);
    });

    // Aggregate sales count & total revenue by business_id
    const salesAgg = await this.saleModel.aggregate([
      {
        $group: {
          _id: '$business_id',
          sales_count: { $sum: 1 },
          total_revenue: { $sum: '$total_amount' },
        },
      },
    ]);
    const salesMap = new Map<string, { count: number; revenue: number }>();
    salesAgg.forEach((s) => {
      if (s._id) {
        salesMap.set(s._id.toString(), {
          count: s.sales_count,
          revenue: s.total_revenue || 0,
        });
      }
    });

    return businesses.map((b: any) => {
      const bId = b._id.toString();
      const pCount = productMap.get(bId) || 0;
      const sData = salesMap.get(bId) || { count: 0, revenue: 0 };
      const bObj = b.toObject ? b.toObject() : { ...b };

      return {
        ...bObj,
        status: bObj.status || 'active',
        products_count: pCount,
        sales_count: sData.count,
        total_revenue: sData.revenue,
      };
    });
  }

  async getBusinessDetails(id: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid business ID');
    }

    const business = await this.businessModel
      .findById(id)
      .populate('owner', 'full_name email role')
      .exec();

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const businessId = new Types.ObjectId(id);

    // Fetch products belonging to this business
    const products = await this.productModel
      .find({ business_id: businessId })
      .sort({ createdAt: -1 })
      .exec();

    // Fetch sales belonging to this business
    const sales = await this.saleModel
      .find({ business_id: businessId })
      .sort({ createdAt: -1 })
      .exec();

    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalInventoryStock = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const lowStockCount = products.filter(
      (p) => (p.quantity || 0) <= (p.low_stock_threshold ?? business.low_stock_threshold ?? 10),
    ).length;
    const avgOrderValue = sales.length > 0 ? totalRevenue / sales.length : 0;

    const bObj = business.toObject ? business.toObject() : { ...business };

    return {
      ...bObj,
      status: bObj.status || 'active',
      stats: {
        products_count: products.length,
        total_inventory_stock: totalInventoryStock,
        low_stock_count: lowStockCount,
        sales_count: sales.length,
        total_revenue: totalRevenue,
        avg_order_value: avgOrderValue,
      },
      products,
      sales,
    };
  }

  async updateBusinessStatus(id: string, dto: UpdateBusinessStatusDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid business ID');
    }

    const business = await this.businessModel.findById(id).populate('owner', 'full_name email role');
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    business.status = dto.status;
    business.blocked_at = dto.status === 'blocked' ? new Date() : null;
    business.block_reason = dto.reason || (dto.status === 'blocked' ? 'Suspended by Super Admin' : '');

    await business.save();
    return business;
  }
}
