"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const placeSchema = new mongoose_1.default.Schema({
    id: String,
    description: String,
    placeId: String,
    coords: {
        latitude: Number,
        longitude: Number,
    },
}, { _id: false });
const rideSchema = new mongoose_1.default.Schema({
    passengerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Driver' },
    pickup: { type: placeSchema, required: true },
    dropoff: { type: placeSchema, required: true },
    status: {
        type: String,
        enum: ['searching', 'accepted', 'arriving', 'ongoing', 'completed', 'cancelled'],
        default: 'searching',
    },
    fare: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    distanceKm: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
}, { timestamps: true });
rideSchema.index({ passengerId: 1, status: 1 });
rideSchema.index({ driverId: 1, status: 1 });
rideSchema.index({ status: 1 });
exports.RideModel = mongoose_1.default.model('Ride', rideSchema);
