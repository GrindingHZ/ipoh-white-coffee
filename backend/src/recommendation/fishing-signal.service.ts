import { Injectable } from '@nestjs/common';
import { Warning } from '../weather/weather.service';
import stateDistricts from '../data/state-districts.json';

export type CoastType = 'east' | 'west' | 'borneo';
export type MonsoonFlag = 'favorable' | 'unfavorable' | 'critical';
export type WaveOps = 'safe' | 'caution' | 'dangerous';

export interface FishingSignals {
  coastType: CoastType;
  monsoonFlag: MonsoonFlag;
  waveOps: WaveOps;
  maxWaveHeightMetres: number | null;
  monsoonImpactNote: string;
  operabilityNote: string;
  coastProfileNote: string;
}

@Injectable()
export class FishingSignalService {
  private readonly johorEastDistricts = ['Mersing', 'Kota Tinggi'];
  private readonly johorWestDistricts = [
    'Johor Bahru',
    'Kulai',
    'Pontian',
    'Batu Pahat',
    'Muar',
    'Segamat',
    'Tangkak',
    'Kluang',
  ];

  private readonly coastMonthMap: Record<
    CoastType,
    Record<string, MonsoonFlag>
  > = {
    east: {
      '1': 'critical',
      '2': 'critical',
      '3': 'favorable',
      '4': 'favorable',
      '5': 'favorable',
      '6': 'favorable',
      '7': 'favorable',
      '8': 'favorable',
      '9': 'favorable',
      '10': 'favorable',
      '11': 'critical',
      '12': 'critical',
    },
    west: {
      '1': 'favorable',
      '2': 'favorable',
      '3': 'favorable',
      '4': 'favorable',
      '5': 'favorable',
      '6': 'favorable',
      '7': 'favorable',
      '8': 'favorable',
      '9': 'favorable',
      '10': 'favorable',
      '11': 'favorable',
      '12': 'favorable',
    },
    borneo: {
      '1': 'unfavorable',
      '2': 'unfavorable',
      '3': 'favorable',
      '4': 'favorable',
      '5': 'favorable',
      '6': 'favorable',
      '7': 'favorable',
      '8': 'favorable',
      '9': 'favorable',
      '10': 'favorable',
      '11': 'unfavorable',
      '12': 'unfavorable',
    },
  };

  score(district: string, warnings: Warning[], month: number): FishingSignals {
    if (month < 1 || month > 12) {
      throw new Error('month must be between 1 and 12');
    }

    const coastType = this.resolveCoastType(district);
    const monsoonFlag = this.resolveMonsoonFlag(coastType, month);
    const waveOps = this.resolveWaveOps(warnings);
    const maxWaveHeight = this.getMaxWaveHeight(warnings);

    return {
      coastType,
      monsoonFlag,
      waveOps,
      maxWaveHeightMetres: maxWaveHeight,
      monsoonImpactNote: this.getMonsoonImpactNote(coastType, monsoonFlag),
      operabilityNote: this.getOperabilityNote(waveOps),
      coastProfileNote: this.getCoastProfileNote(coastType),
    };
  }

  private resolveCoastType(district: string): CoastType {
    const normalized = district.trim().toLowerCase();

    if (this.johorEastDistricts.some((d) => d.toLowerCase() === normalized)) {
      return 'east';
    }
    if (this.johorWestDistricts.some((d) => d.toLowerCase() === normalized)) {
      return 'west';
    }

    for (const [state, districts] of Object.entries(stateDistricts)) {
      const stateNormalized = state.trim().toLowerCase();

      if (
        districts.some((d: string) => d.trim().toLowerCase() === normalized)
      ) {
        if (['sabah', 'sarawak', 'w.p. labuan'].includes(stateNormalized)) {
          return 'borneo';
        } else if (
          ['kelantan', 'terengganu', 'pahang'].includes(stateNormalized)
        ) {
          return 'east';
        } else if (
          [
            'kedah',
            'perlis',
            'pulau pinang',
            'perak',
            'selangor',
            'negeri sembilan',
            'melaka',
          ].includes(stateNormalized)
        ) {
          return 'west';
        }
      }
    }

    return 'west';
  }

  private resolveMonsoonFlag(coastType: CoastType, month: number): MonsoonFlag {
    return this.coastMonthMap[coastType][month.toString()];
  }

  private resolveWaveOps(warnings: Warning[]): WaveOps {
    const maxHeight = this.getMaxWaveHeight(warnings);

    if (maxHeight === null || maxHeight <= 2.0) {
      return 'safe';
    } else if (maxHeight > 2.0 && maxHeight <= 3.0) {
      return 'caution';
    } else {
      return 'dangerous';
    }
  }

  private getMaxWaveHeight(warnings: Warning[]): number | null {
    const heights = warnings
      .map((w) => w.waveHeightMetres)
      .filter((h) => h !== null);
    return heights.length > 0 ? Math.max(...heights) : null;
  }

  private getMonsoonImpactNote(
    coastType: CoastType,
    monsoonFlag: MonsoonFlag,
  ): string {
    if (coastType === 'east' && monsoonFlag === 'critical') {
      return 'East Coast Nov-Feb: historical landings fall to roughly 42% of Sep-Oct peak levels; treat monsoon risk as operationally critical.';
    } else if (coastType === 'east' && monsoonFlag === 'favorable') {
      return 'East Coast Mar-Oct: historical landings recover from the Northeast Monsoon low and remain near the annual operating window.';
    } else if (coastType === 'west' && monsoonFlag === 'favorable') {
      return 'West Coast: historical landings are comparatively stable year-round; the Strait of Malacca shelters this coast from the strongest monsoon exposure.';
    } else if (coastType === 'borneo' && monsoonFlag === 'unfavorable') {
      return 'Borneo Nov-Feb: historical landings sit around 70% of the April peak; treat as a soft low season rather than a full shutdown.';
    } else if (coastType === 'borneo' && monsoonFlag === 'favorable') {
      return 'Borneo Mar-Oct: historical landings are strongest around Mar-May and remain workable through the middle of the year.';
    }

    return '';
  }

  private getOperabilityNote(waveOps: WaveOps): string {
    switch (waveOps) {
      case 'safe':
        return 'No active warning indicates waves above 2.0m.';
      case 'caution':
        return 'Active warning indicates waves above 2.0m; small-vessel trips need caution.';
      case 'dangerous':
        return 'Active warning indicates waves above 3.0m; small-vessel operations should be treated as dangerous.';
    }
  }

  private getCoastProfileNote(coastType: CoastType): string {
    switch (coastType) {
      case 'east':
        return 'East-facing Peninsular coast with direct Northeast Monsoon exposure.';
      case 'west':
        return 'Strait of Malacca coast, sheltered year-round by Sumatra.';
      case 'borneo':
        return 'Sabah, Sarawak, and Labuan fisheries with a softer Nov-Feb seasonal dip and Mar-May peak.';
    }
  }
}
