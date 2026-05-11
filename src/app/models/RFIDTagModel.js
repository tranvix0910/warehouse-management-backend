import mongoose from 'mongoose';

const RFIDTagSchema = new mongoose.Schema(
  {
    tagId: {
      type: String,
      required: true,
      unique: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'products',
    },
    assignedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastScannedAt: {
      type: Date,
    },
    lastScannedBy: {
      type: String, // readerId
    },
  },
  { timestamps: true }
);

// Note: tagId index is automatically created by unique constraint

// Add index on productId for product-to-tag queries
RFIDTagSchema.index({ productId: 1 });

// Add index on isActive for filtering active tags
RFIDTagSchema.index({ isActive: 1 });

// Add compound index for active tag queries by product
RFIDTagSchema.index({ productId: 1, isActive: 1 });

const RFIDTagModel = mongoose.model('rfidtags', RFIDTagSchema);

export default RFIDTagModel;
