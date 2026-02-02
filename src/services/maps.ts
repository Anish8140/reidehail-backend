/**
 * Google Maps Directions API – optional. Set GOOGLE_MAPS_API_KEY in env.
 */

import https from 'https';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const BASE_URL = 'https://maps.googleapis.com/maps/api/directions/json';

export interface DirectionsResult {
  distanceKm: number;
  durationMinutes: number;
  polyline: string | null;
  success: boolean;
}

function getJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

export async function getDirections(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<DirectionsResult> {
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
    const data = await getJson<{ status: string; routes?: { legs: { distance: { value: number }; duration: { value: number } }[]; overview_polyline?: { points: string } }[] }>(url);
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
  } catch (e) {
    console.error('[Maps] Directions error:', e);
    return {
      distanceKm: 5,
      durationMinutes: 15,
      polyline: null,
      success: false,
    };
  }
}
