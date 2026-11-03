import { VehicleType } from '../common/enums';
import { calculateFee, calculateRoundedHours } from './ticket-fee';

describe('Perhitungan tarif parkir', () => {
  const entry = new Date('2026-01-01T08:00:00.000Z');

  const after = (hours: number, minutes = 0): Date =>
    new Date(entry.getTime() + hours * 60 * 60 * 1000 + minutes * 60 * 1000);

  it('membulatkan durasi ke atas dan minimal 1 jam', () => {
    expect(calculateRoundedHours(entry, after(0, 1))).toBe(1);
    expect(calculateRoundedHours(entry, after(1))).toBe(1);
    expect(calculateRoundedHours(entry, after(1, 1))).toBe(2);
    expect(calculateRoundedHours(entry, after(3, 10))).toBe(4);
  });

  it('menghitung tarif CAR sesuai contoh kontrak (3 jam 10 menit = Rp 9.000)', () => {
    expect(calculateFee(VehicleType.CAR, entry, after(3, 10))).toBe(9000);
    expect(calculateFee(VehicleType.CAR, entry, after(0, 1))).toBe(3000);
    expect(calculateFee(VehicleType.CAR, entry, after(2))).toBe(5000);
  });

  it('menghitung tarif MOTORCYCLE', () => {
    expect(calculateFee(VehicleType.MOTORCYCLE, entry, after(0, 1))).toBe(2000);
    expect(calculateFee(VehicleType.MOTORCYCLE, entry, after(2))).toBe(3000);
    expect(calculateFee(VehicleType.MOTORCYCLE, entry, after(3, 10))).toBe(5000);
  });
});
