import TransactionModel from '../models/TransactionModel.js';
import UserModel from '../models/UserModel.js';
import ProductModel from '../models/ProductModel.js';

export const createTransaction = async (req, res) => {
  const userId = req.user._id;
  const { date, type, supplier, customer, note, items } = req.body;

  try {
    // 1) Validate user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 2) Validate payload
    if (!type || !['stock_in', 'stock_out'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Items are required' });
    }

    // 3) Validate items and compute total quantity
    let totalQuantity = 0;
    const productUpdates = [];

    for (const item of items) {
      const productId = item.product;
      const qty = Number(item.quantity);

      if (!productId || !qty || qty <= 0 || !Number.isFinite(qty)) {
        return res.status(400).json({ success: false, message: 'Invalid item payload' });
      }

      const product = await ProductModel.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      if (type === 'stock_out' && product.quantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.productName}`,
        });
      }

      productUpdates.push({ product, qty });
      totalQuantity += qty;
    }

    // 4) Apply stock updates
    for (const { product, qty } of productUpdates) {
      if (type === 'stock_in') {
        product.quantity += qty;
      } else {
        product.quantity -= qty;
      }
      await product.save();
    }

    // 5) Create transaction record
    const newTransaction = new TransactionModel({
      type,
      note,
      quantity: totalQuantity,
      items: items.map((it) => ({ product: it.product, quantity: Number(it.quantity) })),
      supplier: supplier || undefined,
      customer: customer || undefined,
      date: date ? new Date(date) : new Date(),
    });

    await newTransaction.save();

    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: newTransaction,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllTransaction = async (req, res) => {
  const userId = req.user._id;

  try {
    // Kiểm tra user có tồn tại
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Lấy danh sách transaction của user, sort theo ngày mới nhất
    // Populate chi tiết sản phẩm trong items
    const transactions = await TransactionModel.find()
      .populate({
        path: 'items.product',
      })
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      message: 'Get transactions successfully',
      data: transactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
