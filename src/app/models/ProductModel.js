import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      unique: true,
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
    category: {
      type: String,
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
    // RFID tracking fields (optional for backward compatibility)
    rfidTag: {
      tagId: {
        type: String,
      },
      assignedAt: {
        type: Date,
      },
    },
    currentLocation: {
      locationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "locations",
      },
      locationName: {
        type: String,
      },
      readerId: {
        type: String,
      },
      updatedAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

const ProductModel = mongoose.model("products", ProductSchema);
export default ProductModel;
