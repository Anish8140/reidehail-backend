"use strict";
/**
 * Fare calculation – configurable via env for production.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFare = calculateFare;
exports.getFareConfig = getFareConfig;
const baseFare = Number(process.env.FARE_BASE) || 2.5;
const perKm = Number(process.env.FARE_PER_KM) || 1.2;
const perMin = Number(process.env.FARE_PER_MIN) || 0.15;
const currency = process.env.FARE_CURRENCY || 'USD';
function calculateFare(input) {
    const { distanceKm, durationMinutes } = input;
    const amount = Math.round((baseFare + distanceKm * perKm + durationMinutes * perMin) * 100) / 100;
    return {
        amount,
        currency,
        distanceKm,
        durationMinutes,
    };
}
function getFareConfig() {
    return { baseFare, perKm, perMin, currency };
}
