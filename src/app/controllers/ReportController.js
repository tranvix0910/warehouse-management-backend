import ProductModel from '../models/ProductModel.js';
import TransactionModel from '../models/TransactionModel.js';
import UserModel from '../models/UserModel.js';

export const getReportSummary = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Low Stock (ví dụ: < 10)
    const lowStockCount = await ProductModel.countDocuments({ quantity: { $gt: 0, $lt: 10 } });

    const outOfStockCount = await ProductModel.countDocuments({ quantity: 0 });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStockInTransactions = await TransactionModel.find({
      type: 'stock_in',
      date: { $gte: thirtyDaysAgo },
    }).select('items.product');

    const recentProductIds = new Set();
    recentStockInTransactions.forEach((tx) =>
      tx.items.forEach((item) => recentProductIds.add(item.product.toString()))
    );

    // Đếm sản phẩm không nằm trong recentProductIds
    const oldStockCount = await ProductModel.countDocuments({
      _id: { $nin: Array.from(recentProductIds) },
      quantity: { $gt: 0 }, // chỉ tính sản phẩm còn tồn kho
    });

    // Lấy số lượng sản phẩm còn hàng (quantity > 0)
    const totalProductCount = await ProductModel.countDocuments();

    return res.status(200).json({
      success: true,
      message: 'Get stock summary successfully',
      data: {
        lowStock: lowStockCount,
        oldStock: oldStockCount,
        outOfStock: outOfStockCount,
        totalProduct: totalProductCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getOldStock = async (req, res) => {
  const userId = req.user._id;
  try {
    // 1) Validate user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2) Lấy mốc 30 ngày trước
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 3) Lấy tất cả sản phẩm còn tồn kho
    const products = await ProductModel.find({ quantity: { $gt: 0 } });

    const result = [];
    for (const product of products) {
      // Tìm lần stock_in gần nhất
      const lastStockIn = await TransactionModel.findOne({
        type: "stock_in",
        "items.product": product._id,
      })
        .sort({ date: -1 })
        .select("date");

      if (lastStockIn && lastStockIn.date >= thirtyDaysAgo) {
        // Nếu có nhập kho trong 30 ngày gần nhất => bỏ qua
        continue;
      }

      let daysSinceLastStockIn;
      if (lastStockIn) {
        // Nếu có nhập kho nhưng > 30 ngày trước => tính từ ngày nhập cuối
        const diffMs = Date.now() - new Date(lastStockIn.date).getTime();
        daysSinceLastStockIn = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      } else {
        // Nếu chưa từng nhập kho => tính từ ngày tạo sản phẩm
        const diffMs = Date.now() - new Date(product.date).getTime();
        daysSinceLastStockIn = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      result.push({
        ...product.toObject(),
        daysSinceLastStockIn,
      });
    }

    const { page, limit } = req.query;

    // If page & limit provided → paginate manually (in-memory filtering)
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, parseInt(limit));
      const skip = (pageNum - 1) * limitNum;
      const paginatedResult = result.slice(skip, skip + limitNum);

      return res.status(200).json({
        success: true,
        message: "Get old stock successfully",
        data: paginatedResult,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.length,
          totalPages: Math.ceil(result.length / limitNum),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get old stock successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getOutOfStock = async (req, res) => {
  const userId = req.user._id;
  try {
    // 1) Validate user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { page, limit } = req.query;
    const filter = { quantity: 0 };

    // If page & limit provided → paginate
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, parseInt(limit));
      const skip = (pageNum - 1) * limitNum;

      const [outOfStockProducts, total] = await Promise.all([
        ProductModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        ProductModel.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Get out of stock successfully',
        data: outOfStockProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    // No pagination → return all
    const outOfStockProducts = await ProductModel.find(filter);

    return res.status(200).json({
      success: true,
      message: 'Get out of stock successfully',
      data: outOfStockProducts,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getLowStock = async (req, res) => {
  const userId = req.user._id;
  try {
    // 1) Validate user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { page, limit } = req.query;
    const filter = { quantity: { $gt: 0, $lt: 10 } };

    // If page & limit provided → paginate
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, parseInt(limit));
      const skip = (pageNum - 1) * limitNum;

      const [lowStockProducts, total] = await Promise.all([
        ProductModel.find(filter).sort({ quantity: 1 }).skip(skip).limit(limitNum),
        ProductModel.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Get low stock successfully',
        data: lowStockProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    // No pagination → return all
    const lowStockProducts = await ProductModel.find(filter);

    return res.status(200).json({
      success: true,
      message: 'Get low stock successfully',
      data: lowStockProducts,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}; 