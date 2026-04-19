import { FuelPriceInfo, FuelService } from '../../../fuel/fuel.service';

export function fuelSlice(
  fuel: FuelPriceInfo | null,
  fuelCapacityLitres: number | null,
  fuelService: FuelService,
): string {
  if (!fuel) return '';
  const price = `RON95: RM${fuel.ron95Price.toFixed(2)}/litre`;
  if (!fuelCapacityLitres) return price;
  const cost = fuelService.estimateTripCost(fuelCapacityLitres, fuel.ron95Price);
  return `${price}. Estimated round-trip fuel cost: RM${cost.toFixed(2)} (${fuelCapacityLitres}L tank).`;
}
