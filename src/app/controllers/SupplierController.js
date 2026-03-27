import SupplierModel from '../models/SupplierModel.js';
import UserModel from '../models/UserModel.js';
import TransactionModel from '../models/TransactionModel.js';

export const createSupplier = async (req, res) => {
  const userId = req.user._id;
  const { name, email, address, notes, phone } = req.body;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const newSupplier = new SupplierModel({
      name,
      email,
      address,
      notes,
      phone,
    });
    await newSupplier.save();
    return res
      .status(201)
      .json({ success: true, message: 'Supplier created successfully', data: newSupplier });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllSuppliers = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { page, limit, search } = req.query;

    // Build filter query
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    // If page & limit provided → paginate, otherwise return all (backward compatible)
    if (page && limit) {
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, parseInt(limit));
      const skip = (pageNum - 1) * limitNum;

      const [suppliers, total] = await Promise.all([
        SupplierModel.find(filter)
          .sort({ isFavorite: -1, name: 1 })
          .skip(skip)
          .limit(limitNum),
        SupplierModel.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Get suppliers success',
        data: suppliers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    // No pagination → return all
    const suppliers = await SupplierModel.find(filter).sort({ isFavorite: -1, name: 1 });

    return res.status(200).json({
      success: true,
      message: 'Get suppliers success',
      data: suppliers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateSupplier = async (req, res) => {
  const userId = req.user._id;
  const supplierId = req.params.id;
  const { name, email, address, notes, phone } = req.body;

  try {
    // Kiểm tra user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Kiểm tra supplier có tồn tại không
    const supplier = await SupplierModel.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Cập nhật các trường nếu có truyền dữ liệu
    if (name !== undefined) supplier.name = name;
    if (email !== undefined) supplier.email = email;
    if (address !== undefined) supplier.address = address;
    if (notes !== undefined) supplier.notes = notes;
    if (phone !== undefined) supplier.phone = phone;

    await supplier.save();

    return res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  const userId = req.user._id;
  const supplierId = req.params.id;

  try {
    // Kiểm tra user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Kiểm tra supplier có tồn tại không
    const supplier = await SupplierModel.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Kiểm tra xem supplier có trong transaction nào không
    const transactionsWithSupplier = await TransactionModel.find({
      supplier: supplier.name,
    });

    if (transactionsWithSupplier.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier. It is referenced in ${transactionsWithSupplier.length} transaction(s)`,
        transactionCount: transactionsWithSupplier.length,
      });
    }

    // Xóa supplier
    await SupplierModel.findByIdAndDelete(supplierId);

    return res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleFavoriteSupplier = async (req, res) => {
  const userId = req.user._id;
  const supplierId = req.params.id;

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const supplier = await SupplierModel.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    supplier.isFavorite = !supplier.isFavorite;
    await supplier.save();

    return res
      .status(200)
      .json({ success: true, message: 'Toggle favorite supplier success', data: supplier });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
