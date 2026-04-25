import { Warning, ForecastSlotResult } from '../../../weather/weather.service';
import { FishingSignals } from '../../fishing-signal.service';

export function warningSlice(
  warnings: Warning[],
  signals: FishingSignals,
): string {
  if (!warnings.length && signals.waveOps === 'safe') return '';

  let result = '';
  if (warnings.length) {
    const lines = warnings.map((w) => {
      let line = `- ${w.title_en} (valid until ${w.valid_to})`;
      if (w.waveHeightMetres != null) {
        line += ` (wave height ${w.waveHeightMetres}m)`;
      }
      return line;
    });
    result = `Active weather warnings:\n${lines.join('\n')}`;
  }

  const hasWaveHeightInWarnings = warnings.some(
    (w) => w.waveHeightMetres != null,
  );
  const shouldShowSeaState =
    signals.waveOps === 'caution' ||
    signals.waveOps === 'dangerous' ||
    hasWaveHeightInWarnings;

  if (shouldShowSeaState) {
    if (result) {
      result += '\n';
    }
    result += `Sea state assessment: ${signals.operabilityNote}`;
  }

  return result;
}

export function forecastSlice(
  forecast: ForecastSlotResult | null,
  district: string,
): string {
  if (!forecast) return '';
  return `Weather forecast for ${district} (${forecast.slot}): ${forecast.value}`;
}
