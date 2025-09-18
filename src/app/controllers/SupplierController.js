import SupplierModel from '../models/SupplierModel.js';
import UserModel from '../models/UserModel.js';

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

    // sore theo isFavorite và name
    const suppliers = await SupplierModel.find().sort({ isFavorite: -1, name: 1 });

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
  try {
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
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
