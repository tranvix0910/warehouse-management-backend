import mongoose from 'mongoose';

const LocationHistorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'products',
      required: true,
    },
    productName: {
      type: String,
    },
    productSKU: {
      type: String,
    },
    previousLocation: {
      locationId: {
        type: mongoose.Schema.Types.ObjectId,
      },
      locationName: {
        type: String,
      },
    },
    newLocation: {
      locationId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      locationName: {
        type: String,
        required: true,
      },
    },
    readerId: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Add index on timestamp for efficient time-based queries (Requirement 6.3, 6.4)
LocationHistorySchema.index({ timestamp: 1 });

// Add index on productId for product-specific history queries (Requirement 6.4)
LocationHistorySchema.index({ productId: 1 });

// Add compound index for product history queries with date range filtering (Requirement 6.4)
LocationHistorySchema.index({ productId: 1, timestamp: -1 });

// Add index on newLocation.locationId for location-based queries (Requirement 6.4)
LocationHistorySchema.index({ 'newLocation.locationId': 1 });

// Add compound index for location-based queries with date range (Requirement 6.4)
LocationHistorySchema.index({ 'newLocation.locationId': 1, timestamp: -1 });

const LocationHistoryModel = mongoose.model('location_history', LocationHistorySchema);

export default LocationHistoryModel;
