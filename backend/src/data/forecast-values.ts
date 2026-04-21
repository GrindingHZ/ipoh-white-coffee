export const THUNDERSTORM_EN = 'Thunderstorm';
export const THUNDERSTORM_BM = 'Ribut Petir';
export const THUNDERSTORM_FORECAST_PREFIX = 'Ribut petir';

export const FORECAST_SLOTS = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  NIGHT: 'night',
} as const;

export type ForecastSlot = (typeof FORECAST_SLOTS)[keyof typeof FORECAST_SLOTS];

export const SLOT_HOUR_RANGES: Record<ForecastSlot, [number, number]> = {
  morning: [5, 12],
  afternoon: [12, 18],
  night: [18, 5],
};
