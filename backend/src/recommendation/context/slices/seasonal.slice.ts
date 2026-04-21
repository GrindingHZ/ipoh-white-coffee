import { PrismaService } from '../../../prisma/prisma.service';

export async function seasonalSlice(
  prisma: PrismaService,
  district: string,
  targetSpecies: string[],
  month: number,
): Promise<string> {
  if (!targetSpecies.length) return '';

  const patterns = await prisma.seasonalPattern.findMany({
    where: {
      district,
      month,
      species: { in: targetSpecies },
    },
  });

  if (!patterns.length) return '';

  const lines = patterns.map(
    (p) => `${p.species}: ${p.activityLevel} activity${p.notes ? ` (${p.notes})` : ''}`,
  );
  return `Seasonal fishing conditions for ${district} in month ${month}:\n${lines.join('\n')}`;
}
