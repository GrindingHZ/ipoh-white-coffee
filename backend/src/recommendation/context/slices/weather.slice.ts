import { Warning, ForecastSlotResult } from '../../../weather/weather.service';

export function warningSlice(warnings: Warning[]): string {
  if (!warnings.length) return '';
  const lines = warnings.map(
    (w) => `- ${w.title_en} (valid until ${w.valid_to})`,
  );
  return `Active weather warnings:\n${lines.join('\n')}`;
}

export function forecastSlice(forecast: ForecastSlotResult | null, district: string): string {
  if (!forecast) return '';
  return `Weather forecast for ${district} (${forecast.slot}): ${forecast.value}`;
}
