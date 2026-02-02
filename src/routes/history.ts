import { Router } from 'express';
import { RideModel } from '../models/Ride';
import { authMiddleware, requirePassenger, type AuthReq } from '../middleware/auth';

export const historyRouter = Router();

function toRideResponse(ride: any, driverDoc?: any) {
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

historyRouter.get('/', authMiddleware, requirePassenger, async (req: AuthReq, res) => {
  try {
    const list = await RideModel.find({
      passengerId: req.userId,
      status: { $in: ['completed', 'cancelled'] },
    })
      .sort({ updatedAt: -1 })
      .populate('driverId')
      .lean();
    const out = list.map((r: any) => toRideResponse(r, r.driverId));
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

historyRouter.get('/:id', authMiddleware, requirePassenger, async (req: AuthReq, res) => {
  try {
    const ride = await RideModel.findOne({
      _id: req.params.id,
      passengerId: req.userId,
    })
      .populate('driverId')
      .lean();
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.json(toRideResponse(ride, (ride as any).driverId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});
