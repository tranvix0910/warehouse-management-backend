import ProductModel from '../models/ProductModel.js';
import UserModel from '../models/UserModel.js';

export const getAllProducts = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const products = await ProductModel.find();
    if (!products) {
      return res.status(404).json({ success: false, message: "Products doesn't exist" });
    }
    return res.status(200).json({ success: true, message: 'Get products success', data: products });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSingleProduct = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const product = await ProductModel.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Products doesn't exist" });
    }
    return res.status(200).json({ success: true, message: 'Get products success', data: product });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req, res) => {
  const userId = req.user._id;
  const {
    productName,
    SKU,
    category,
    quantity,
    cost,
    price,
    RAM,
    date,
    GPU,
    color,
    processor,
  } = req.body;

  try {
    // ✅ Kiểm tra user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // ✅ Kiểm tra trùng SKU
    const existingProduct = await ProductModel.findOne({ SKU });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists',
      });
    }

    // ✅ Lấy URL ảnh từ Cloudinary (do Multer đã upload sẵn)
    let imageUrl = null;
    if (req.file) {
      imageUrl = req.file.path; // Multer-Cloudinary trả về link
    }

    // ✅ Tạo sản phẩm mới
    const newProduct = new ProductModel({
      image: imageUrl,
      productName,
      SKU,
      category,
      quantity,
      cost,
      price,
      RAM,
      date,
      GPU,
      color,
      processor,
    });

    await newProduct.save();

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: newProduct,
    });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
