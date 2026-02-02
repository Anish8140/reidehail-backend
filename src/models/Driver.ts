import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isOnline: { type: Boolean, default: false },
  lastLocation: {
    latitude: Number,
    longitude: Number,
  },
  name: { type: String, default: 'Driver' },
  vehicle: { type: String, default: 'Car' },
  plateNumber: { type: String, default: '' },
  phone: { type: String, default: '' },
  rating: { type: Number, default: 5 },
}, { timestamps: true });

driverSchema.index({ userId: 1 }, { unique: true });
driverSchema.index({ isOnline: 1 });

export const DriverModel = mongoose.model('Driver', driverSchema);
