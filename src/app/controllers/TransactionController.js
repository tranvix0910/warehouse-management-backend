import TransactionModel from "../models/TransactionModel.js";
import UserModel from "../models/UserModel.js";
import ProductModel from "../models/ProductModel.js";
import SupplierModel from "../models/SupplierModel.js";
import CustomerModel from "../models/CustomerModel.js";

export const createTransaction = async (req, res) => {
  const userId = req.user._id;
  const { date, type, supplier, customer, note, items } = req.body;

  try {
    // 1) Validate user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 2) Validate payload
    if (!type || !["stock_in", "stock_out"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid transaction type" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Items are required" });
    }

    const existingCustomer = await CustomerModel.find({ name: customer });
    const existingSupplier = await SupplierModel.find({ name: supplier });

    if (!existingCustomer || !existingSupplier) {
      return res
        .status(404)
        .json({ success: false, message: "Customer or Supplier not found" });
    }

    // 3) Validate items and compute total quantity
    let totalQuantity = 0;
    const productUpdates = [];

    for (const item of items) {
      const productId = item.product;
      const qty = Number(item.quantity);

      if (!productId || !qty || qty <= 0 || !Number.isFinite(qty)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid item payload" });
      }

      const product = await ProductModel.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      if (type === "stock_out" && product.quantity < qty) {
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
      if (type === "stock_in") {
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
      items: items.map((it) => ({
        product: it.product,
        quantity: Number(it.quantity),
      })),
      supplier: supplier || undefined,
      customer: customer || undefined,
      date: date ? new Date(date) : new Date(),
    });

    await newTransaction.save();

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
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
        message: "User not found",
      });
    }

    // Lấy danh sách transaction của user, sort theo ngày mới nhất
    // Populate chi tiết sản phẩm trong items
    const transactions = await TransactionModel.find()
      .populate({
        path: "items.product",
      })
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      message: "Get transactions successfully",
      data: transactions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getInfoTransaction = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const totalTrans = await TransactionModel.countDocuments();
    const totalStockOut = await TransactionModel.countDocuments({
      type: "stock_out",
    });
    const totalStockIn = await TransactionModel.countDocuments({
      type: "stock_in",
    });

    return res.status(200).json({
      success: true,
      data: {
        totalTrans,
        totalStockOut,
        totalStockIn,
      },
    });
  } catch (error) {
    console.error("Error getInfoTransaction:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteTransaction = async (req, res) => {
  const userId = req.user._id;
  const transactionId = req.params.id;

  try {
    // 1) Validate user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 2) Find transaction with populated items
    const transaction = await TransactionModel.findById(transactionId).populate(
      "items.product"
    );

    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    // 3) Reverse stock changes
    for (const item of transaction.items) {
      const product = item.product;
      const qty = item.quantity;

      if (transaction.type === "stock_in") {
        // Reverse stock_in: subtract the quantity
        if (product.quantity < qty) {
          return res.status(400).json({
            success: false,
            message: `Cannot delete transaction: insufficient stock for product ${product.productName}`,
          });
        }
        product.quantity -= qty;
      } else {
        // Reverse stock_out: add back the quantity
        product.quantity += qty;
      }
      await product.save();
    }

    // 4) Delete transaction
    await TransactionModel.findByIdAndDelete(transactionId);

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTransaction = async (req, res) => {
  const userId = req.user._id;
  const transactionId = req.params.id;
  const { date, supplier, customer, note, items } = req.body; // ignore type changes from body

  try {
    // 1) Validate user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 2) Find existing transaction with populated items
    const existingTransaction = await TransactionModel.findById(
      transactionId
    ).populate("items.product");

    if (!existingTransaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }
    const existingCustomer = await CustomerModel.find({ name: customer });
    const existingSupplier = await SupplierModel.find({ name: supplier });

    if (!existingCustomer || !existingSupplier) {
      return res
        .status(404)
        .json({ success: false, message: "Customer or Supplier not found" });
    }

    // 3) Validate new payload (do not allow changing transaction type)

    if (items && (!Array.isArray(items) || items.length === 0)) {
      return res
        .status(400)
        .json({ success: false, message: "Items are required" });
    }

    // 4) Reverse existing stock changes first
    for (const item of existingTransaction.items) {
      const product = item.product;
      const qty = item.quantity;
      if (existingTransaction.type === "stock_in") {
        // Reverse stock_in: subtract the quantity
        if (product.quantity < qty) {
          return res.status(400).json({
            success: false,
            message: `Cannot update transaction: insufficient stock for product ${product.productName}`,
          });
        }
        product.quantity -= qty;
      } else {
        product.quantity += qty;
      }
      await product.save();
    }

    let newTotalQuantity = 0;
    const productUpdates = [];

    if (items) {
      for (const item of items) {
        const productId = item.product;
        const qty = Number(item.quantity);

        if (!productId || !qty || qty <= 0 || !Number.isFinite(qty)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid item payload" });
        }

        const product = await ProductModel.findById(productId);
        if (!product) {
          return res
            .status(404)
            .json({ success: false, message: "Product not found" });
        }

        const newType = existingTransaction.type;
        if (newType === "stock_out" && product.quantity < qty) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product ${product.productName}`,
          });
        }

        productUpdates.push({ product, qty });
        newTotalQuantity += qty;
      }

      // Apply new stock updates
      for (const { product, qty } of productUpdates) {
        const newType = existingTransaction.type;
        if (newType === "stock_in") {
          product.quantity += qty;
        } else {
          product.quantity -= qty;
        }
        await product.save();
      }
    }

    // 6) Update transaction record
    const updateData = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (supplier !== undefined) updateData.supplier = supplier;
    if (customer !== undefined) updateData.customer = customer;
    if (note !== undefined) updateData.note = note;
    if (items !== undefined) {
      updateData.items = items.map((it) => ({
        product: it.product,
        quantity: Number(it.quantity),
      }));
      updateData.quantity = newTotalQuantity;
    }

    const updatedTransaction = await TransactionModel.findByIdAndUpdate(
      transactionId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).populate("items.product");

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: updatedTransaction,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
