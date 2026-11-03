import { VehicleType } from '../common/enums';

const HOUR_IN_MS = 60 * 60 * 1000;

/**
 * Durasi dibulatkan ke atas per jam, minimal 1 jam.
 */
export function calculateRoundedHours(
  entryTime: Date,
  exitTime: Date,
): number {
  const durationMs = Math.max(0, exitTime.getTime() - entryTime.getTime());

  return Math.max(1, Math.ceil(durationMs / HOUR_IN_MS));
}

/**
 * CAR         : Rp 3.000 jam pertama + Rp 2.000 per jam berikutnya
 * MOTORCYCLE  : Rp 2.000 jam pertama + Rp 1.000 per jam berikutnya
 */
export function calculateFee(
  vehicleType: VehicleType,
  entryTime: Date,
  exitTime: Date,
): number {
  const hours = calculateRoundedHours(entryTime, exitTime);
  const firstHourFee = vehicleType === VehicleType.CAR ? 3000 : 2000;
  const nextHourFee = vehicleType === VehicleType.CAR ? 2000 : 1000;

  return firstHourFee + (hours - 1) * nextHourFee;
}
