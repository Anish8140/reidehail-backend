import { Router } from 'express';
import { RideModel } from '../models/Ride';
import { DriverModel } from '../models/Driver';
import { authMiddleware, requirePassenger, requireDriver, type AuthReq } from '../middleware/auth';
import { getDirections } from '../services/maps';
import { calculateFare } from '../config/fare';
import { emitToDrivers, emitToPassenger } from '../realtime';

export const rideRouter = Router();

function toRideResponse(ride: any, driverDoc?: any, passengerDoc?: any) {
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

rideRouter.post('/estimate', async (req, res) => {
  try {
    const { pickup, dropoff } = req.body || {};
    if (!pickup?.coords || !dropoff?.coords) {
      return res.status(400).json({ message: 'Pickup and dropoff required' });
    }
    const origin = pickup.coords;
    const destination = dropoff.coords;
    const directions = await getDirections(origin, destination);
    const fareResult = calculateFare({
      distanceKm: directions.distanceKm,
      durationMinutes: directions.durationMinutes,
    });
    res.json({
      ...fareResult,
      polyline: directions.polyline,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

rideRouter.post('/book', authMiddleware, requirePassenger, async (req: AuthReq, res) => {
  try {
    const { pickup, dropoff, fare, distanceKm, durationMinutes } = req.body || {};
    if (!pickup || !dropoff || fare == null) {
      return res.status(400).json({ message: 'Missing booking data' });
    }
    const ride = await RideModel.create({
      passengerId: req.userId,
      pickup,
      dropoff,
      fare: Number(fare),
      distanceKm: Number(distanceKm ?? 5),
      durationMinutes: Number(durationMinutes ?? 15),
      status: 'searching',
    });
    const populated = await RideModel.findById(ride._id).populate('passengerId');
    const passengerDoc = (populated as any)?.passengerId;
    const out = toRideResponse(populated || ride, undefined, passengerDoc);
    emitToDrivers('ride:request', out);
    res.status(201).json(toRideResponse(populated || ride, undefined));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

rideRouter.get('/active', authMiddleware, requirePassenger, async (req: AuthReq, res) => {
  try {
    const ride = await RideModel.findOne({
      passengerId: req.userId,
      status: { $in: ['searching', 'accepted', 'arriving', 'ongoing'] },
    })
      .sort({ createdAt: -1 })
      .limit(1)
      .populate('driverId');
    if (!ride) return res.json({ ride: null });
    const driverDoc = ride.driverId as any;
    res.json({ ride: toRideResponse(ride, driverDoc, undefined) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

rideRouter.post('/:id/assign', authMiddleware, requirePassenger, async (req, res) => {
  const rideId = req.params.id;
  const driver = await DriverModel.findOne({ isOnline: true }).limit(1);
  if (!driver) {
    return res.status(400).json({ message: 'No driver available' });
  }
  const ride = await RideModel.findByIdAndUpdate(
    rideId,
    { $set: { driverId: driver._id, status: 'accepted', updatedAt: new Date() } },
    { new: true }
  ).populate('driverId');
  if (!ride) return res.status(404).json({ message: 'Ride not found' });
  res.json(toRideResponse(ride, (ride as any).driverId, undefined));
});

rideRouter.patch('/:id/status', authMiddleware, requirePassenger, async (req: AuthReq, res) => {
  try {
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ message: 'Status required' });
    const ride = await RideModel.findOne({ _id: req.params.id, passengerId: req.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.status = status;
    ride.updatedAt = new Date();
    if (status === 'completed') ride.completedAt = new Date();
    if (status === 'cancelled') ride.cancelledAt = new Date();
    await ride.save();
    const populated = await RideModel.findById(ride._id).populate('driverId');
    res.json(toRideResponse(populated, (populated as any)?.driverId, undefined));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

rideRouter.post('/:id/cancel', authMiddleware, requirePassenger, async (req: AuthReq, res) => {
  try {
    const { reason } = req.body || {};
    const ride = await RideModel.findOne({ _id: req.params.id, passengerId: req.userId });
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.status = 'cancelled';
    ride.cancelledAt = new Date();
    ride.updatedAt = new Date();
    ride.cancellationReason = reason || 'No reason';
    await ride.save();
    const populated = await RideModel.findById(ride._id).populate('driverId');
    res.json(toRideResponse(populated, (populated as any)?.driverId, undefined));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

rideRouter.patch('/:id/driver-location', authMiddleware, requireDriver, async (req, res) => {
  try {
    const { location } = req.body || {};
    if (!location) return res.status(400).json({ message: 'Location required' });
    const ride = await RideModel.findById(req.params.id).populate('driverId');
    if (!ride || !ride.driverId) return res.status(404).json({ message: 'Ride not found' });
    const driver = ride.driverId as any;
    await DriverModel.findByIdAndUpdate(driver._id, { lastLocation: location });
    const updated = await RideModel.findById(ride._id).populate('driverId');
    const d = (updated as any)?.driverId;
    res.json(toRideResponse(updated, d ? { ...d.toObject(), location } : d, undefined));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});
