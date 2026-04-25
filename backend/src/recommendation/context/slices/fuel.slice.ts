import { FuelPriceResponse } from '../../../fuel/fuel.service';

export function fuelSlice(
  fuel: FuelPriceResponse | null,
  fuelCapacityLitres: number | null,
): string {
  if (!fuel) return '';
  const price = `RON95: RM${fuel.ron95Price.toFixed(2)}/litre. Diesel: RM${fuel.dieselPrice.toFixed(2)}/litre`;
  if (!fuelCapacityLitres) return price;
  const cost = Math.round(fuelCapacityLitres * fuel.dieselPrice * 100) / 100;
  return `${price}. Estimated round-trip fuel cost: RM${cost.toFixed(2)} (${fuelCapacityLitres}L tank, diesel).`;
}
