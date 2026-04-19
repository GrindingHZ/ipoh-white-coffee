import { TideInfo } from '../../../tide/tide.service';

function moonPhase(date: Date): string {
  const known = new Date(2000, 0, 6).getTime();
  const diff = date.getTime() - known;
  const days = diff / 86400000;
  const cycle = 29.53058867;
  const phase = ((days % cycle) + cycle) % cycle;
  if (phase < 1.85) return 'New Moon';
  if (phase < 7.38) return 'Waxing Crescent';
  if (phase < 9.22) return 'First Quarter';
  if (phase < 14.77) return 'Waxing Gibbous';
  if (phase < 16.61) return 'Full Moon';
  if (phase < 22.15) return 'Waning Gibbous';
  if (phase < 23.99) return 'Last Quarter';
  if (phase < 29.53) return 'Waning Crescent';
  return 'New Moon';
}

export function tideSlice(tide: TideInfo | null, date: Date): string {
  const moon = moonPhase(date);
  if (!tide) return `Moon phase: ${moon}`;
  return `Tide at departure: ${tide.stateAtHour} (high ${tide.highHeight}m at ${tide.highTime}, low ${tide.lowHeight}m at ${tide.lowTime}). Moon: ${moon}.`;
}
