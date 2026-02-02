"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.historyRouter = void 0;
const express_1 = require("express");
const Ride_1 = require("../models/Ride");
const auth_1 = require("../middleware/auth");
exports.historyRouter = (0, express_1.Router)();
function toRideResponse(ride, driverDoc) {
    const r = ride.toObject ? ride.toObject() : ride;
    const driver = driverDoc
        ? {
            id: String(driverDoc._id),
            name: driverDoc.name || 'Driver',
            rating: driverDoc.rating ?? 5,
            vehicle: driverDoc.vehicle || 'Car',
            plateNumber: driverDoc.plateNumber || '',
            phone: driverDoc.phone || '',
            location: driverDoc.lastLocation || r.pickup?.coords,
        }
        : undefined;
    return {
        id: String(r._id),
        passengerId: String(r.passengerId),
        pickup: r.pickup,
        dropoff: r.dropoff,
        status: r.status,
        fare: r.fare,
        currency: r.currency || 'USD',
        distanceKm: r.distanceKm,
        durationMinutes: r.durationMinutes,
        driver,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        completedAt: r.completedAt,
        cancelledAt: r.cancelledAt,
        cancellationReason: r.cancellationReason,
    };
}
exports.historyRouter.get('/', auth_1.authMiddleware, auth_1.requirePassenger, async (req, res) => {
    try {
        const list = await Ride_1.RideModel.find({
            passengerId: req.userId,
            status: { $in: ['completed', 'cancelled'] },
        })
            .sort({ updatedAt: -1 })
            .populate('driverId')
            .lean();
        const out = list.map((r) => toRideResponse(r, r.driverId));
        res.json(out);
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.historyRouter.get('/:id', auth_1.authMiddleware, auth_1.requirePassenger, async (req, res) => {
    try {
        const ride = await Ride_1.RideModel.findOne({
            _id: req.params.id,
            passengerId: req.userId,
        })
            .populate('driverId')
            .lean();
        if (!ride)
            return res.status(404).json({ message: 'Ride not found' });
        res.json(toRideResponse(ride, ride.driverId));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
