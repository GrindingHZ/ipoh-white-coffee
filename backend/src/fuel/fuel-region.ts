import districtStateMap from '../data/district-state-map.json';

export type DieselRegion = 'peninsular' | 'east_malaysia';

const EAST_MALAYSIA_STATES = ['sabah', 'sarawak', 'labuan'];

export function resolveDieselRegion(locality?: string): DieselRegion {
  const normalized = locality?.trim().toLowerCase();
  if (!normalized) return 'peninsular';

  if (EAST_MALAYSIA_STATES.some((state) => normalized.includes(state))) {
    return 'east_malaysia';
  }

  const mappedEastMalaysiaDistrict = Object.entries(
    districtStateMap as Record<string, string>,
  ).some(([district, state]) => {
    return (
      EAST_MALAYSIA_STATES.includes(state.toLowerCase()) &&
      normalized.includes(district.toLowerCase())
    );
  });

  return mappedEastMalaysiaDistrict ? 'east_malaysia' : 'peninsular';
}
