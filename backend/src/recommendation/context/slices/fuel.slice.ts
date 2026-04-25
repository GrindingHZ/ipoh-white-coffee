import { FuelPriceResponse } from '../../../fuel/fuel.service';

export function fuelSlice(
  fuel: FuelPriceResponse | null,
  fuelCapacityLitres: number | null,
): string {
  if (!fuel) return '';
  const dieselStr = `Diesel (boat): RM${fuel.dieselPrice.toFixed(2)}/L`;
  const ron95Str = `RON95 (car): RM${fuel.ron95Price.toFixed(2)}/L`;
  if (!fuelCapacityLitres) return `${dieselStr}. ${ron95Str}.`;
  const boatCost = Math.round(fuelCapacityLitres * fuel.dieselPrice * 100) / 100;
  return `${dieselStr} — estimated RM${boatCost.toFixed(2)} round-trip (${fuelCapacityLitres}L tank). ${ron95Str}.`;
}
