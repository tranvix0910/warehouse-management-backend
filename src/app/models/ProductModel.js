import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    cost: {
      type: String,
      required: true,
    },
    price: {
      type: String,
      required: true,
    },
    SKU: {
      type: String,
      required: true,
    },
    barcode: {
      type: String,
      required: true,
    },
    category: {
      type: String,
    },
    productName: {
      type: String,
      required: true,
    },
    RAM: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    GPU: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    processor: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const ProductModel = mongoose.model("products", ProductSchema);
export default ProductModel;
