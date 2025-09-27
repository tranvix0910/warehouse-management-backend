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