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
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2) Lấy danh sách giao dịch nhập kho trong 30 ngày gần đây
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStockIn = await TransactionModel.find({
      type: 'stock_in',
      date: { $gte: thirtyDaysAgo },
    }).select('items.product');

    const recentProductIds = new Set();
    recentStockIn.forEach((tx) =>
      tx.items.forEach((item) => recentProductIds.add(item.product.toString()))
    );

    // 3) Lấy danh sách sản phẩm cũ (không nằm trong recentProductIds)
    const oldStockProducts = await ProductModel.find({
      _id: { $nin: Array.from(recentProductIds) },
      quantity: { $gt: 0 },
    });

    // 4) Tính số ngày chưa nhập kho cho từng sản phẩm
    const result = [];
    for (const product of oldStockProducts) {
      // Lấy giao dịch nhập kho gần nhất của sản phẩm này
      const lastStockIn = await TransactionModel.findOne({
        type: 'stock_in',
        'items.product': product._id,
      })
        .sort({ date: -1 }) // lấy giao dịch mới nhất
        .select('date');

      let daysSinceLastStockIn = null;
      if (lastStockIn) {
        const diffMs = Date.now() - new Date(lastStockIn.date).getTime();
        daysSinceLastStockIn = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      result.push({
        ...product.toObject(),
        daysSinceLastStockIn,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Get old stock successfully',
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

    // 2) Lấy sản phẩm có quantity = 0
    const outOfStockProducts = await ProductModel.find({ quantity: 0 });

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

    // 2) Lấy sản phẩm có quantity < 10 và > 0
    const lowStockProducts = await ProductModel.find({
      quantity: { $gt: 0, $lt: 10 },
    });

    return res.status(200).json({
      success: true,
      message: 'Get low stock successfully',
      data: lowStockProducts,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};