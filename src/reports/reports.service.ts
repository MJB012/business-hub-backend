import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Sale.name)
    private saleModel: Model<SaleDocument>,
    @InjectModel(Expense.name)
    private expenseModel: Model<ExpenseDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  private getBusinessObjectId(businessId: string | Types.ObjectId): Types.ObjectId {
    return typeof businessId === 'string' ? new Types.ObjectId(businessId) : businessId;
  }

  private getBusinessFilter(businessId: string | Types.ObjectId) {
    const bId = this.getBusinessObjectId(businessId);
    return { $in: [bId, bId.toString()] };
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    const filter: Record<string, any> = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = startDate;
      }
      if (endDate) {
        // If endDate is YYYY-MM-DD, append T23:59:59.999Z so transactions throughout that entire day match
        filter.date.$lte = endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`;
      }
    }
    return filter;
  }

  async getFinancialSummary(
    businessId: string | Types.ObjectId,
    query?: ReportQueryDto,
  ) {
    const bFilter = this.getBusinessFilter(businessId);
    const dateFilter = this.buildDateFilter(query?.startDate, query?.endDate);

    const salesFilter: Record<string, any> = {
      business_id: bFilter,
      ...dateFilter,
    };
    if (query?.payment_method && query.payment_method !== 'all') {
      salesFilter.payment_method = query.payment_method;
    }

    const expensesFilter: Record<string, any> = {
      business_id: bFilter,
      ...dateFilter,
    };
    if (query?.payment_method && query.payment_method !== 'all') {
      expensesFilter.payment_method = query.payment_method;
    }
    if (query?.category && query.category !== 'all') {
      expensesFilter.category = query.category;
    }

    // 1. Sales aggregation
    const salesAgg = await this.saleModel.aggregate([
      { $match: salesFilter },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: '$total_amount' },
          total_orders: { $sum: 1 },
          total_units: { $sum: '$quantity' },
          total_discount: { $sum: '$discount' },
        },
      },
    ]);

    const salesStats = salesAgg[0] || {
      total_revenue: 0,
      total_orders: 0,
      total_units: 0,
      total_discount: 0,
    };

    // 2. Expenses aggregation
    const expenseAgg = await this.expenseModel.aggregate([
      { $match: expensesFilter },
      {
        $group: {
          _id: null,
          total_expenses: { $sum: '$amount' },
          total_entries: { $sum: 1 },
        },
      },
    ]);

    const expenseStats = expenseAgg[0] || {
      total_expenses: 0,
      total_entries: 0,
    };

    const totalRevenue = salesStats.total_revenue || 0;
    const totalExpenses = expenseStats.total_expenses || 0;
    const netProfit = totalRevenue - totalExpenses;
    const netProfitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const averageOrderValue =
      salesStats.total_orders > 0
        ? totalRevenue / salesStats.total_orders
        : 0;

    // 3. Daily timeline (normalize date to YYYY-MM-DD via substrCP)
    const dailySales = await this.saleModel.aggregate([
      { $match: salesFilter },
      {
        $group: {
          _id: { $substrCP: [{ $ifNull: ['$date', ''] }, 0, 10] },
          revenue: { $sum: '$total_amount' },
          orders: { $sum: 1 },
          units: { $sum: '$quantity' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyExpenses = await this.expenseModel.aggregate([
      { $match: expensesFilter },
      {
        $group: {
          _id: { $substrCP: [{ $ifNull: ['$date', ''] }, 0, 10] },
          expenses: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const timelineMap: Record<
      string,
      {
        date: string;
        revenue: number;
        expenses: number;
        net_profit: number;
        orders: number;
      }
    > = {};

    dailySales.forEach((d) => {
      const dt = d._id || 'Unknown';
      if (!timelineMap[dt]) {
        timelineMap[dt] = {
          date: dt,
          revenue: 0,
          expenses: 0,
          net_profit: 0,
          orders: 0,
        };
      }
      timelineMap[dt].revenue += d.revenue || 0;
      timelineMap[dt].orders += d.orders || 0;
    });

    dailyExpenses.forEach((d) => {
      const dt = d._id || 'Unknown';
      if (!timelineMap[dt]) {
        timelineMap[dt] = {
          date: dt,
          revenue: 0,
          expenses: 0,
          net_profit: 0,
          orders: 0,
        };
      }
      timelineMap[dt].expenses += d.expenses || 0;
    });

    const dailyTimeline = Object.values(timelineMap)
      .map((item) => ({
        ...item,
        net_profit: item.revenue - item.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: {
        startDate: query?.startDate || null,
        endDate: query?.endDate || null,
      },
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      net_profit_margin: netProfitMargin,
      total_orders: salesStats.total_orders,
      total_units_sold: salesStats.total_units,
      total_discounts: salesStats.total_discount,
      average_order_value: averageOrderValue,
      total_expense_entries: expenseStats.total_entries,
      daily_timeline: dailyTimeline,
    };
  }

  async getSalesReport(
    businessId: string | Types.ObjectId,
    query?: ReportQueryDto,
  ) {
    const bFilter = this.getBusinessFilter(businessId);
    const filter: Record<string, any> = {
      business_id: bFilter,
      ...this.buildDateFilter(query?.startDate, query?.endDate),
    };

    if (query?.payment_method && query.payment_method !== 'all') {
      filter.payment_method = query.payment_method;
    }

    const sales = await this.saleModel
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .exec();

    const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalUnits = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalDiscounts = sales.reduce((sum, s) => sum + (s.discount || 0), 0);
    const ordersCount = sales.length;
    const avgOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;
    const maxSale = ordersCount > 0 ? Math.max(...sales.map((s) => s.total_amount || 0)) : 0;

    // Top selling products
    const productMap: Record<
      string,
      {
        name: string;
        units_sold: number;
        revenue: number;
        orders_count: number;
      }
    > = {};

    sales.forEach((s) => {
      const pName = s.product_name || 'Unassigned Product';
      if (!productMap[pName]) {
        productMap[pName] = {
          name: pName,
          units_sold: 0,
          revenue: 0,
          orders_count: 0,
        };
      }
      productMap[pName].units_sold += s.quantity || 0;
      productMap[pName].revenue += s.total_amount || 0;
      productMap[pName].orders_count += 1;
    });

    const topProducts = Object.values(productMap)
      .map((p) => ({
        ...p,
        average_price: p.units_sold > 0 ? p.revenue / p.units_sold : 0,
        percentage_of_sales: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Sales by payment method
    const paymentMap: Record<string, { method: string; amount: number; count: number }> = {};
    sales.forEach((s) => {
      const method = s.payment_method || 'Cash';
      if (!paymentMap[method]) {
        paymentMap[method] = { method, amount: 0, count: 0 };
      }
      paymentMap[method].amount += s.total_amount || 0;
      paymentMap[method].count += 1;
    });

    const paymentMethods = Object.values(paymentMap)
      .map((p) => ({
        ...p,
        percentage: totalRevenue > 0 ? (p.amount / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Top customers
    const customerMap: Record<string, { name: string; total_spent: number; orders_count: number }> = {};
    sales.forEach((s) => {
      const cust = s.customer_name?.trim() || 'Walk-in Customer';
      if (!customerMap[cust]) {
        customerMap[cust] = { name: cust, total_spent: 0, orders_count: 0 };
      }
      customerMap[cust].total_spent += s.total_amount || 0;
      customerMap[cust].orders_count += 1;
    });

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 10);

    // Daily sales trend (normalize date to YYYY-MM-DD)
    const dailyMap: Record<string, { date: string; revenue: number; orders: number; units: number }> = {};
    sales.forEach((s) => {
      const dt = s.date ? s.date.slice(0, 10) : 'Unknown';
      if (!dailyMap[dt]) {
        dailyMap[dt] = { date: dt, revenue: 0, orders: 0, units: 0 };
      }
      dailyMap[dt].revenue += s.total_amount || 0;
      dailyMap[dt].orders += 1;
      dailyMap[dt].units += s.quantity || 0;
    });

    const salesTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      total_revenue: totalRevenue,
      total_units: totalUnits,
      total_orders: ordersCount,
      total_discounts: totalDiscounts,
      average_order_value: avgOrderValue,
      largest_sale: maxSale,
      top_products: topProducts,
      payment_methods: paymentMethods,
      top_customers: topCustomers,
      sales_trend: salesTrend,
      sales_list: sales,
    };
  }

  async getExpensesReport(
    businessId: string | Types.ObjectId,
    query?: ReportQueryDto,
  ) {
    const bFilter = this.getBusinessFilter(businessId);
    const filter: Record<string, any> = {
      business_id: bFilter,
      ...this.buildDateFilter(query?.startDate, query?.endDate),
    };

    if (query?.category && query.category !== 'all') {
      filter.category = query.category;
    }
    if (query?.payment_method && query.payment_method !== 'all') {
      filter.payment_method = query.payment_method;
    }

    const expenses = await this.expenseModel
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .exec();

    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const entriesCount = expenses.length;
    const avgExpense = entriesCount > 0 ? totalExpenses / entriesCount : 0;
    const largestExpense =
      entriesCount > 0 ? Math.max(...expenses.map((e) => Number(e.amount) || 0)) : 0;

    // Expenses by category
    const categoryMap: Record<string, { category: string; amount: number; count: number }> = {};
    expenses.forEach((e) => {
      const cat = e.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, amount: 0, count: 0 };
      }
      categoryMap[cat].amount += Number(e.amount) || 0;
      categoryMap[cat].count += 1;
    });

    const categories = Object.values(categoryMap)
      .map((c) => ({
        ...c,
        percentage: totalExpenses > 0 ? (c.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Expenses by payment method
    const paymentMap: Record<string, { method: string; amount: number; count: number }> = {};
    expenses.forEach((e) => {
      const method = e.payment_method || 'Cash';
      if (!paymentMap[method]) {
        paymentMap[method] = { method, amount: 0, count: 0 };
      }
      paymentMap[method].amount += Number(e.amount) || 0;
      paymentMap[method].count += 1;
    });

    const paymentMethods = Object.values(paymentMap)
      .map((p) => ({
        ...p,
        percentage: totalExpenses > 0 ? (p.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Expenses by vendor
    const vendorMap: Record<string, { vendor: string; amount: number; count: number }> = {};
    expenses.forEach((e) => {
      const vendor = e.vendor?.trim() || 'General Vendor';
      if (!vendorMap[vendor]) {
        vendorMap[vendor] = { vendor, amount: 0, count: 0 };
      }
      vendorMap[vendor].amount += Number(e.amount) || 0;
      vendorMap[vendor].count += 1;
    });

    const topVendors = Object.values(vendorMap)
      .map((v) => ({
        ...v,
        percentage: totalExpenses > 0 ? (v.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Daily expense trend (normalize date to YYYY-MM-DD)
    const dailyMap: Record<string, { date: string; amount: number; count: number }> = {};
    expenses.forEach((e) => {
      const dt = e.date ? e.date.slice(0, 10) : 'Unknown';
      if (!dailyMap[dt]) {
        dailyMap[dt] = { date: dt, amount: 0, count: 0 };
      }
      dailyMap[dt].amount += Number(e.amount) || 0;
      dailyMap[dt].count += 1;
    });

    const expenseTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      total_expenses: totalExpenses,
      entries_count: entriesCount,
      average_expense: avgExpense,
      largest_expense: largestExpense,
      categories,
      payment_methods: paymentMethods,
      top_vendors: topVendors,
      expense_trend: expenseTrend,
      expenses_list: expenses,
    };
  }

  async getInventoryReport(businessId: string | Types.ObjectId) {
    const bFilter = this.getBusinessFilter(businessId);

    const products = await this.productModel
      .find({ business_id: bFilter })
      .sort({ name: 1 })
      .exec();

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    const totalValuation = products.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.price) || 0),
      0,
    );

    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const lowStockAlerts: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      quantity: number;
      price: number;
      threshold: number;
      status: 'low_stock' | 'out_of_stock';
    }> = [];

    // Grouping by category
    const categoryMap: Record<
      string,
      {
        category: string;
        products_count: number;
        total_quantity: number;
        total_value: number;
      }
    > = {};

    products.forEach((p) => {
      const qty = Number(p.quantity) || 0;
      const threshold = p.low_stock_threshold ?? 10;
      const price = Number(p.price) || 0;
      const cat = p.category || 'General';

      if (qty === 0) {
        outOfStockCount++;
        lowStockAlerts.push({
          id: p._id.toString(),
          name: p.name,
          sku: p.sku,
          category: cat,
          quantity: qty,
          price,
          threshold,
          status: 'out_of_stock',
        });
      } else if (qty <= threshold) {
        lowStockCount++;
        lowStockAlerts.push({
          id: p._id.toString(),
          name: p.name,
          sku: p.sku,
          category: cat,
          quantity: qty,
          price,
          threshold,
          status: 'low_stock',
        });
      } else {
        inStockCount++;
      }

      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          products_count: 0,
          total_quantity: 0,
          total_value: 0,
        };
      }
      categoryMap[cat].products_count += 1;
      categoryMap[cat].total_quantity += qty;
      categoryMap[cat].total_value += qty * price;
    });

    const categoryBreakdown = Object.values(categoryMap)
      .map((c) => ({
        ...c,
        percentage_of_value:
          totalValuation > 0 ? (c.total_value / totalValuation) * 100 : 0,
      }))
      .sort((a, b) => b.total_value - a.total_value);

    // Sort alerts: out of stock first, then ascending quantity
    lowStockAlerts.sort((a, b) => a.quantity - b.quantity);

    return {
      total_products: totalProducts,
      total_stock_quantity: totalStock,
      total_inventory_valuation: totalValuation,
      health_summary: {
        in_stock: inStockCount,
        low_stock: lowStockCount,
        out_of_stock: outOfStockCount,
      },
      category_breakdown: categoryBreakdown,
      low_stock_alerts: lowStockAlerts,
      products_list: products,
    };
  }
}
