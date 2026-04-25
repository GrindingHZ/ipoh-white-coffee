import { FuelPriceResponse } from '../../../fuel/fuel.service';

export function fuelSlice(
  fuel: FuelPriceResponse | null,
  fuelCapacityLitres: number | null,
  previousWeekDieselPrice: number | null,
): string {
  if (!fuel) return '';
  const dieselChange =
    previousWeekDieselPrice !== null
      ? ` (was RM${previousWeekDieselPrice.toFixed(2)}/L last week)`
      : '';
  let dieselStr = `Boat fuel (diesel): RM${fuel.dieselPrice.toFixed(2)}/L${dieselChange}`;
  if (fuelCapacityLitres) {
    const boatCost = Math.round(fuelCapacityLitres * fuel.dieselPrice * 100) / 100;
    dieselStr += ` — estimated RM${boatCost.toFixed(2)} for a full tank (${fuelCapacityLitres}L)`;
  }
  return `${dieselStr}. Travel fuel (RON95 petrol for car): RM${fuel.ron95Price.toFixed(2)}/L (small-scale fishermen subsidy covers up to 50L).`;
}
