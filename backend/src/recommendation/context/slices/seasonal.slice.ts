import { PrismaService } from '../../../prisma/prisma.service';
import { FishingSignals } from '../../fishing-signal.service';

export async function seasonalSlice(
  prisma: PrismaService,
  district: string,
  targetSpecies: string[],
  month: number,
  signals: FishingSignals,
): Promise<string> {
  const patterns = await prisma.seasonalPattern.findMany({
    where: {
      district,
      month,
      species: { in: targetSpecies },
    },
  });

  const monsoonBlock = `MONSOON ASSESSMENT:\n${signals.monsoonImpactNote}\n${signals.coastProfileNote}`;

  if (!patterns.length) {
    return monsoonBlock;
  }

  const lines = patterns.map(
    (p) =>
      `${p.species}: ${p.activityLevel} activity${p.notes ? ` (${p.notes})` : ''}`,
  );
  const seasonalPatternsBlock = `Seasonal fishing conditions for ${district} in month ${month}:\n${lines.join('\n')}`;

  return `${seasonalPatternsBlock}\n\n${monsoonBlock}`;
}
