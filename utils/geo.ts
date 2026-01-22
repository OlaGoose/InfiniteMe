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
