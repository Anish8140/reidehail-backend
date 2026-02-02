"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const driverSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
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
driverSchema.index({ userId: 1 });
driverSchema.index({ isOnline: 1 });
exports.DriverModel = mongoose_1.default.model('Driver', driverSchema);
