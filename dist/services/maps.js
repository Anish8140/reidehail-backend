"use strict";
/**
 * Google Maps Directions API – optional. Set GOOGLE_MAPS_API_KEY in env.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDirections = getDirections;
const https_1 = __importDefault(require("https"));
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/directions/json';
function getJson(url) {
    return new Promise((resolve, reject) => {
        https_1.default
            .get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch (e) {
                    reject(e);
                }
            });
        })
            .on('error', reject);
    });
}
async function getDirections(origin, destination) {
    if (!API_KEY) {
        return {
            distanceKm: 2 + Math.random() * 15,
            durationMinutes: Math.round(10 + Math.random() * 25),
            polyline: null,
            success: false,
        };
    }
    try {
        const url = `${BASE_URL}?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${API_KEY}`;
        const data = await getJson(url);
        if (data.status !== 'OK' || !data.routes?.[0]) {
            return {
                distanceKm: 5,
                durationMinutes: 15,
                polyline: null,
                success: false,
            };
        }
        const leg = data.routes[0].legs[0];
        const distanceKm = leg.distance.value / 1000;
        const durationMinutes = Math.round(leg.duration.value / 60);
        const polyline = data.routes[0].overview_polyline?.points || null;
        return { distanceKm, durationMinutes, polyline, success: true };
    }
    catch (e) {
        console.error('[Maps] Directions error:', e);
        return {
            distanceKm: 5,
            durationMinutes: 15,
            polyline: null,
            success: false,
        };
    }
}
