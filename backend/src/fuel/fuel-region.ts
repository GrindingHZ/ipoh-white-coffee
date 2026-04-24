import districtsByState from '../data/state-districts.json';

export type DieselRegion = 'peninsular' | 'east_malaysia';

const EAST_MALAYSIA_STATES = ['sabah', 'sarawak', 'labuan'];

const EAST_MALAYSIA_DISTRICTS = Object.entries(
  districtsByState as Record<string, string[]>,
)
  .filter(([state]) => EAST_MALAYSIA_STATES.some((s) => state.toLowerCase().includes(s)))
  .flatMap(([, districts]) => districts.map((d) => d.toLowerCase()));

export function resolveDieselRegion(locality?: string): DieselRegion {
  const normalized = locality?.trim().toLowerCase();
  if (!normalized) return 'peninsular';

  if (EAST_MALAYSIA_STATES.some((state) => normalized.includes(state))) {
    return 'east_malaysia';
  }

  return EAST_MALAYSIA_DISTRICTS.some((district) => normalized.includes(district))
    ? 'east_malaysia'
    : 'peninsular';
}
