import UserModel from '../models/UserModel.js';
import CustomerModel from '../models/CustomerModel.js';

export const createCustomer = async (req, res) => {
  const userId = req.user._id;
  const { name, email, address, notes, phone } = req.body;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const newCustomer = new CustomerModel({
      name,
      email,
      address,
      notes,
      phone,
    });
    await newCustomer.save();
    return res
      .status(201)
      .json({ success: true, message: 'Supplier created successfully', data: newCustomer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllCustomers = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // sort theo isFavorite và name
    const customers = await CustomerModel.find().sort({ isFavorite: -1, name: 1 });

    return res.status(200).json({
      success: true,
      message: 'Get customers success',
      data: customers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCustomer = async (req, res) => {
  try {
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleFavoriteCustomer = async (req, res) => {
  const userId = req.user._id;
  const customerId = req.params.id;

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const customer = await CustomerModel.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    customer.isFavorite = !customer.isFavorite;
    await customer.save();

    return res
      .status(200)
      .json({ success: true, message: 'Toggle favorite customer success', data: customer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
