import { PrismaService } from '../../../prisma/prisma.service';
import { FishingSignals } from '../../fishing-signal.service';
import districtsByState from '../../../data/state-districts.json';

export async function landingsSlice(
  prisma: PrismaService,
  district: string,
  month: number,
  signals: FishingSignals,
): Promise<string> {
  const state = Object.entries(
    districtsByState as Record<string, string[]>,
  ).find(([, districts]) => districts.includes(district))?.[0];
  if (!state) return '';

  const rows = await prisma.marineLandingStateMonthly.findMany({
    where: { state },
  });

  const currentRow = rows.find((r) => r.month === month);
  if (!currentRow) return '';

  const currentTonnes = currentRow.landingsTonnes.toNumber();

  const coastRows = rows.filter((r) => r.coast === signals.coastType);
  let peakTonnes = 0;
  if (coastRows.length > 0) {
    peakTonnes = Math.max(...coastRows.map((r) => r.landingsTonnes.toNumber()));
  }

  let output = `Historical fish landings for ${state} in month ${month}: ~${Math.round(currentTonnes).toLocaleString()} tonnes average.`;

  if (coastRows.length > 0 && currentTonnes < peakTonnes * 0.6) {
    output += ` (${Math.round((currentTonnes / peakTonnes) * 100)}% of coast peak month)`;
  }

  output += `\nNational landings trend: Malaysian landings declined about 12% from 2018 to 2023 (1.45M to 1.27M tonnes), so recent lower catches may reflect both seasonal and structural pressure.`;

  return output;
}
