import mongoose from 'mongoose';

const LocationSchema = new mongoose.Schema(
  {
    locationName: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    zone: {
      type: String,
    },
    capacity: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Add index on locationName for faster queries
LocationSchema.index({ locationName: 1 });

// Add index on zone for location-based queries
LocationSchema.index({ zone: 1 });

// Add index on isActive for filtering active locations
LocationSchema.index({ isActive: 1 });

const LocationModel = mongoose.model('locations', LocationSchema);

export default LocationModel;
