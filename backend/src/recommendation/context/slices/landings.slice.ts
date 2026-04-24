import { PrismaService } from '../../../prisma/prisma.service';
import districtsByState from '../../../data/state-districts.json';

export async function landingsSlice(
  prisma: PrismaService,
  district: string,
  month: number,
): Promise<string> {
  const state = Object.entries(districtsByState as Record<string, string[]>).find(
    ([, districts]) => districts.includes(district),
  )?.[0];
  if (!state) return '';

  const rows = await prisma.fishLanding.findMany({
    where: {
      state,
      coast: { not: 'all' },
      date: {
        gte: new Date(2018, month - 1, 1),
      },
    },
    select: { date: true, landingsKg: true },
  });

  const monthRows = rows.filter((r) => new Date(r.date).getMonth() + 1 === month);
  if (!monthRows.length) return '';

  const avg = Math.round(monthRows.reduce((sum, r) => sum + r.landingsKg, 0) / monthRows.length);

  return `Historical fish landings for ${state} in month ${month}: ~${avg.toLocaleString()} kg average (based on ${monthRows.length} year${monthRows.length !== 1 ? 's' : ''} of data).`;
}
