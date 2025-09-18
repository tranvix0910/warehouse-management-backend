import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    phone: {
      type: Number,
      required: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const SupplierModel = mongoose.model('suppliers', SupplierSchema);
export default SupplierModel;
