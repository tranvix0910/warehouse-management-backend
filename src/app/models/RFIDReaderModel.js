import mongoose from 'mongoose';

const RFIDReaderSchema = new mongoose.Schema(
  {
    readerId: {
      type: String,
      required: true,
      unique: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'locations',
    },
    locationName: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'error'],
      default: 'active',
    },
    connectionConfig: {
      ipAddress: {
        type: String,
      },
      port: {
        type: Number,
      },
      protocol: {
        type: String,
      },
    },
    lastSeen: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Note: readerId already has a unique index from the schema definition

// Add index on locationId for location-based queries
RFIDReaderSchema.index({ locationId: 1 });

// Add index on status for filtering by reader status
RFIDReaderSchema.index({ status: 1 });

// Add index on isActive for filtering active readers
RFIDReaderSchema.index({ isActive: 1 });

const RFIDReaderModel = mongoose.model('rfid_readers', RFIDReaderSchema);

export default RFIDReaderModel;
