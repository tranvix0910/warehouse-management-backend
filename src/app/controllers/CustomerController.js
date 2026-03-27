import UserModel from '../models/UserModel.js';
import CustomerModel from '../models/CustomerModel.js';
import TransactionModel from '../models/TransactionModel.js';

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
      .json({ success: true, message: 'Customer created successfully', data: newCustomer });
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

      const [customers, total] = await Promise.all([
        CustomerModel.find(filter)
          .sort({ isFavorite: -1, name: 1 })
          .skip(skip)
          .limit(limitNum),
        CustomerModel.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Get customers success',
        data: customers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    // No pagination → return all
    const customers = await CustomerModel.find(filter).sort({ isFavorite: -1, name: 1 });

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
  const userId = req.user._id;
  const customerId = req.params.id;
  const { name, email, address, notes, phone } = req.body;

  try {
    // Kiểm tra user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Kiểm tra customer có tồn tại không
    const customer = await CustomerModel.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Cập nhật các trường nếu có truyền dữ liệu
    if (name !== undefined) customer.name = name;
    if (email !== undefined) customer.email = email;
    if (address !== undefined) customer.address = address;
    if (notes !== undefined) customer.notes = notes;
    if (phone !== undefined) customer.phone = phone;

    await customer.save();

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  const userId = req.user._id;
  const customerId = req.params.id;

  try {
    // Kiểm tra user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Kiểm tra customer có tồn tại không
    const customer = await CustomerModel.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Kiểm tra xem customer có trong transaction nào không
    const transactionsWithCustomer = await TransactionModel.find({
      customer: customer.name,
    });

    if (transactionsWithCustomer.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer. It is referenced in ${transactionsWithCustomer.length} transaction(s)`,
        transactionCount: transactionsWithCustomer.length,
      });
    }

    // Xóa customer
    await CustomerModel.findByIdAndDelete(customerId);

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
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
