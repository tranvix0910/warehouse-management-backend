import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['stock_in', 'stock_out'],
    },
    quantity: {
      type: Number,
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'products',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    supplier: { type: String },
    customer: { type: String },
    note: {
      type: String,
    },
    date: {
      type: Date,
    },
  },
  { timestamps: true }
);

const TransactionModel = mongoose.model('transactions', transactionSchema);

export default TransactionModel;
