import ProductModel from "../models/ProductModel.js";
import UserModel from "../models/UserModel.js";
import TransactionModel from "../models/TransactionModel.js";

export const getAllProducts = async (req, res) => {
  const userId = req.user._id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const products = await ProductModel.find();
    if (!products) {
      return res
        .status(404)
        .json({ success: false, message: "Products doesn't exist" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Get products success", data: products });
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
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const product = await ProductModel.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Products doesn't exist" });
    }
    return res
      .status(200)
      .json({ success: true, message: "Get products success", data: product });
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
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ Kiểm tra trùng SKU
    const existingProduct = await ProductModel.findOne({ SKU });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this SKU already exists",
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
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (error) {
    console.error("❌ Error creating product:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;
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
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ Kiểm tra sản phẩm có tồn tại không
    const product = await ProductModel.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // ✅ Kiểm tra trùng SKU (nếu thay đổi SKU)
    if (SKU && SKU !== product.SKU) {
      const existingProduct = await ProductModel.findOne({ SKU });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Product with this SKU already exists",
        });
      }
    }

    // ✅ Cập nhật ảnh nếu có upload ảnh mới
    let imageUrl = product.image;
    if (req.file) {
      imageUrl = req.file.path;
    }

    // ✅ Cập nhật thông tin sản phẩm
    const updatedProduct = await ProductModel.findByIdAndUpdate(
      productId,
      {
        image: imageUrl,
        productName: productName || product.productName,
        SKU: SKU || product.SKU,
        category: category || product.category,
        quantity: quantity !== undefined ? quantity : product.quantity,
        cost: cost || product.cost,
        price: price || product.price,
        RAM: RAM || product.RAM,
        date: date || product.date,
        GPU: GPU || product.GPU,
        color: color || product.color,
        processor: processor || product.processor,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("❌ Error updating product:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  const userId = req.user._id;
  const { productId } = req.params;

  try {
    // ✅ Kiểm tra user
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ Kiểm tra sản phẩm có tồn tại không
    const product = await ProductModel.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // ✅ Kiểm tra xem sản phẩm có trong transaction nào không
    const transactionsWithProduct = await TransactionModel.find({
      "items.product": productId,
    });

    if (transactionsWithProduct.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product. It is referenced in ${transactionsWithProduct.length} transaction(s)`,
        transactionCount: transactionsWithProduct.length,
      });
    }

    // ✅ Xóa sản phẩm (chỉ khi không có transaction nào reference)
    await ProductModel.findByIdAndDelete(productId);

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
