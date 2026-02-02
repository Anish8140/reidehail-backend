"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rideRouter = void 0;
const express_1 = require("express");
const Ride_1 = require("../models/Ride");
const Driver_1 = require("../models/Driver");
const auth_1 = require("../middleware/auth");
const maps_1 = require("../services/maps");
const fare_1 = require("../config/fare");
const realtime_1 = require("../realtime");
exports.rideRouter = (0, express_1.Router)();
function toRideResponse(ride, driverDoc, passengerDoc) {
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
    const passenger = passengerDoc
        ? {
            id: String(passengerDoc._id),
            name: passengerDoc.name || 'Passenger',
            phone: passengerDoc.phone || '',
            email: passengerDoc.email || '',
        }
        : undefined;
    return {
        id: String(r._id),
        passengerId: String(r.passengerId),
        passenger,
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
exports.rideRouter.post('/estimate', async (req, res) => {
    try {
        const { pickup, dropoff } = req.body || {};
        if (!pickup?.coords || !dropoff?.coords) {
            return res.status(400).json({ message: 'Pickup and dropoff required' });
        }
        const origin = pickup.coords;
        const destination = dropoff.coords;
        const directions = await (0, maps_1.getDirections)(origin, destination);
        const fareResult = (0, fare_1.calculateFare)({
            distanceKm: directions.distanceKm,
            durationMinutes: directions.durationMinutes,
        });
        res.json({
            ...fareResult,
            polyline: directions.polyline,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.rideRouter.post('/book', auth_1.authMiddleware, auth_1.requirePassenger, async (req, res) => {
    try {
        const { pickup, dropoff, fare, distanceKm, durationMinutes } = req.body || {};
        if (!pickup || !dropoff || fare == null) {
            return res.status(400).json({ message: 'Missing booking data' });
        }
        const ride = await Ride_1.RideModel.create({
            passengerId: req.userId,
            pickup,
            dropoff,
            fare: Number(fare),
            distanceKm: Number(distanceKm ?? 5),
            durationMinutes: Number(durationMinutes ?? 15),
            status: 'searching',
        });
        const populated = await Ride_1.RideModel.findById(ride._id).populate('passengerId');
        const passengerDoc = populated?.passengerId;
        const out = toRideResponse(populated || ride, undefined, passengerDoc);
        (0, realtime_1.emitToDrivers)('ride:request', out);
        res.status(201).json(toRideResponse(populated || ride, undefined));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.rideRouter.get('/active', auth_1.authMiddleware, auth_1.requirePassenger, async (req, res) => {
    try {
        const ride = await Ride_1.RideModel.findOne({
            passengerId: req.userId,
            status: { $in: ['searching', 'accepted', 'arriving', 'ongoing'] },
        })
            .sort({ createdAt: -1 })
            .limit(1)
            .populate('driverId');
        if (!ride)
            return res.json({ ride: null });
        const driverDoc = ride.driverId;
        res.json({ ride: toRideResponse(ride, driverDoc, undefined) });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.rideRouter.post('/:id/assign', auth_1.authMiddleware, auth_1.requirePassenger, async (req, res) => {
    const rideId = req.params.id;
    const driver = await Driver_1.DriverModel.findOne({ isOnline: true }).limit(1);
    if (!driver) {
        return res.status(400).json({ message: 'No driver available' });
    }
    const ride = await Ride_1.RideModel.findByIdAndUpdate(rideId, { $set: { driverId: driver._id, status: 'accepted', updatedAt: new Date() } }, { new: true }).populate('driverId');
    if (!ride)
        return res.status(404).json({ message: 'Ride not found' });
    res.json(toRideResponse(ride, ride.driverId, undefined));
});
exports.rideRouter.patch('/:id/status', auth_1.authMiddleware, auth_1.requirePassenger, async (req, res) => {
    try {
        const { status } = req.body || {};
        if (!status)
            return res.status(400).json({ message: 'Status required' });
        const ride = await Ride_1.RideModel.findOne({ _id: req.params.id, passengerId: req.userId });
        if (!ride)
            return res.status(404).json({ message: 'Ride not found' });
        ride.status = status;
        ride.updatedAt = new Date();
        if (status === 'completed')
            ride.completedAt = new Date();
        if (status === 'cancelled')
            ride.cancelledAt = new Date();
        await ride.save();
        const populated = await Ride_1.RideModel.findById(ride._id).populate('driverId');
        res.json(toRideResponse(populated, populated?.driverId, undefined));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.rideRouter.post('/:id/cancel', auth_1.authMiddleware, auth_1.requirePassenger, async (req, res) => {
    try {
        const { reason } = req.body || {};
        const ride = await Ride_1.RideModel.findOne({ _id: req.params.id, passengerId: req.userId });
        if (!ride)
            return res.status(404).json({ message: 'Ride not found' });
        ride.status = 'cancelled';
        ride.cancelledAt = new Date();
        ride.updatedAt = new Date();
        ride.cancellationReason = reason || 'No reason';
        await ride.save();
        const populated = await Ride_1.RideModel.findById(ride._id).populate('driverId');
        res.json(toRideResponse(populated, populated?.driverId, undefined));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.rideRouter.patch('/:id/driver-location', auth_1.authMiddleware, auth_1.requireDriver, async (req, res) => {
    try {
        const { location } = req.body || {};
        if (!location)
            return res.status(400).json({ message: 'Location required' });
        const ride = await Ride_1.RideModel.findById(req.params.id).populate('driverId');
        if (!ride || !ride.driverId)
            return res.status(404).json({ message: 'Ride not found' });
        const driver = ride.driverId;
        await Driver_1.DriverModel.findByIdAndUpdate(driver._id, { lastLocation: location });
        const updated = await Ride_1.RideModel.findById(ride._id).populate('driverId');
        const d = updated?.driverId;
        res.json(toRideResponse(updated, d ? { ...d.toObject(), location } : d, undefined));
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error' });
    }
});
