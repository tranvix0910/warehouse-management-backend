import ProductModel from '../models/ProductModel.js';
import TransactionModel from '../models/TransactionModel.js';
import UserModel from '../models/UserModel.js';

export const getStockSummary = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Low Stock (ví dụ: < 10)
    const lowStockCount = await ProductModel.countDocuments({ quantity: { $gt: 0, $lt: 10 } });

    const outOfStockCount = await ProductModel.countDocuments({ quantity: 0 });

    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() - 30);

    const recentStockInTransactions = await TransactionModel.find({
      type: 'stock_in',
      date: { $gte: sevenDays },
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

    return res.status(200).json({
      success: true,
      message: 'Get stock summary successfully',
      data: {
        lowStock: lowStockCount,
        oldStock: oldStockCount,
        outOfStock: outOfStockCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
