import { LatLng } from '@/types';

const toRad = (deg: number): number => (deg * Math.PI) / 180;

const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export const computeDestinationPoint = (
  start: LatLng,
  distanceMeters: number,
  bearingDegrees: number
): LatLng => {
  const R = 6371e3;
  const δ = distanceMeters / R;
  const θ = toRad(bearingDegrees);

  const φ1 = toRad(start.lat);
  const λ1 = toRad(start.lng);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) +
    Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );

  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
  );

  return {
    lat: toDeg(φ2),
    lng: toDeg(λ2),
  };
};

/**
 * Calculate distance between two points using Haversine formula
 * @returns distance in meters
 */
export const calculateDistance = (from: LatLng, to: LatLng): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δφ = toRad(to.lat - from.lat);
  const Δλ = toRad(to.lng - from.lng);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Calculate bearing (direction) from one point to another
 * @returns bearing in degrees (0-360, where 0 is North)
 */
export const calculateBearing = (from: LatLng, to: LatLng): number => {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (toDeg(θ) + 360) % 360;
};
