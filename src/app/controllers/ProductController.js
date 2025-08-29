import ProductModel from "../models/ProductModel.js";
import UserModel from "../models/UserModel.js";

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
