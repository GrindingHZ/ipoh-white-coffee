import { FishingSignalService } from './fishing-signal.service';
import { Warning } from '../weather/weather.service';

const makeWarning = (waveHeightMetres: number | null): Warning => ({
  title_en: '',
  title_bm: '',
  text_en: '',
  text_bm: '',
  valid_from: '',
  valid_to: '',
  isThunderstorm: false,
  waveHeightMetres,
});

describe('FishingSignalService', () => {
  let service: FishingSignalService;

  beforeEach(() => {
    service = new FishingSignalService();
  });

  describe('coastType — Johor district overrides', () => {
    it('Mersing → east', () => {
      expect(service.score('Mersing', [], 6).coastType).toBe('east');
    });

    it('Kota Tinggi → east', () => {
      expect(service.score('Kota Tinggi', [], 6).coastType).toBe('east');
    });

    it('Johor Bahru → west', () => {
      expect(service.score('Johor Bahru', [], 6).coastType).toBe('west');
    });

    it('Pontian → west', () => {
      expect(service.score('Pontian', [], 6).coastType).toBe('west');
    });
  });

  describe('coastType — Borneo lookup', () => {
    it('Sandakan → borneo', () => {
      expect(service.score('Sandakan', [], 6).coastType).toBe('borneo');
    });

    it('Kuching → borneo', () => {
      expect(service.score('Kuching', [], 6).coastType).toBe('borneo');
    });

    it('W.P. Labuan → borneo', () => {
      expect(service.score('W.P. Labuan', [], 6).coastType).toBe('borneo');
    });
  });

  describe('coastType — East coast lookup', () => {
    it('Kota Bharu → east', () => {
      expect(service.score('Kota Bharu', [], 6).coastType).toBe('east');
    });

    it('Kuantan → east', () => {
      expect(service.score('Kuantan', [], 6).coastType).toBe('east');
    });

    it('Kuala Terengganu → east', () => {
      expect(service.score('Kuala Terengganu', [], 6).coastType).toBe('east');
    });
  });

  describe('coastType — West coast lookup', () => {
    it('Klang → west', () => {
      expect(service.score('Klang', [], 6).coastType).toBe('west');
    });

    it('Manjung → west', () => {
      expect(service.score('Manjung', [], 6).coastType).toBe('west');
    });
  });

  describe('monsoonFlag — east coast all 12 months', () => {
    const eastDistrict = 'Kuantan';
    it.each([
      [1, 'critical'],
      [2, 'critical'],
      [3, 'favorable'],
      [4, 'favorable'],
      [5, 'favorable'],
      [6, 'favorable'],
      [7, 'favorable'],
      [8, 'favorable'],
      [9, 'favorable'],
      [10, 'favorable'],
      [11, 'critical'],
      [12, 'critical'],
    ])('month %i → %s', (month, expected) => {
      expect(service.score(eastDistrict, [], month).monsoonFlag).toBe(expected);
    });
  });

  describe('monsoonFlag — west coast all 12 months', () => {
    const westDistrict = 'Klang';
    it.each([
      [1, 'favorable'],
      [2, 'favorable'],
      [3, 'favorable'],
      [4, 'favorable'],
      [5, 'favorable'],
      [6, 'favorable'],
      [7, 'favorable'],
      [8, 'favorable'],
      [9, 'favorable'],
      [10, 'favorable'],
      [11, 'favorable'],
      [12, 'favorable'],
    ])('month %i → %s', (month, expected) => {
      expect(service.score(westDistrict, [], month).monsoonFlag).toBe(expected);
    });
  });

  describe('monsoonFlag — borneo all 12 months', () => {
    const borneoDistrict = 'Sandakan';
    it.each([
      [1, 'unfavorable'],
      [2, 'unfavorable'],
      [3, 'favorable'],
      [4, 'favorable'],
      [5, 'favorable'],
      [6, 'favorable'],
      [7, 'favorable'],
      [8, 'favorable'],
      [9, 'favorable'],
      [10, 'favorable'],
      [11, 'unfavorable'],
      [12, 'unfavorable'],
    ])('month %i → %s', (month, expected) => {
      expect(service.score(borneoDistrict, [], month).monsoonFlag).toBe(
        expected,
      );
    });
  });

  describe('waveOps and maxWaveHeightMetres', () => {
    const district = 'Klang';
    const month = 6;

    it('no warnings → safe, maxWaveHeightMetres: null', () => {
      const result = service.score(district, [], month);
      expect(result.waveOps).toBe('safe');
      expect(result.maxWaveHeightMetres).toBeNull();
    });

    it('waveHeightMetres: 1.5 → safe', () => {
      const result = service.score(district, [makeWarning(1.5)], month);
      expect(result.waveOps).toBe('safe');
      expect(result.maxWaveHeightMetres).toBe(1.5);
    });

    it('waveHeightMetres: 2.0 → safe', () => {
      const result = service.score(district, [makeWarning(2.0)], month);
      expect(result.waveOps).toBe('safe');
      expect(result.maxWaveHeightMetres).toBe(2.0);
    });

    it('waveHeightMetres: 2.5 → caution', () => {
      const result = service.score(district, [makeWarning(2.5)], month);
      expect(result.waveOps).toBe('caution');
      expect(result.maxWaveHeightMetres).toBe(2.5);
    });

    it('waveHeightMetres: 3.0 → caution', () => {
      const result = service.score(district, [makeWarning(3.0)], month);
      expect(result.waveOps).toBe('caution');
      expect(result.maxWaveHeightMetres).toBe(3.0);
    });

    it('waveHeightMetres: 3.5 → dangerous', () => {
      const result = service.score(district, [makeWarning(3.5)], month);
      expect(result.waveOps).toBe('dangerous');
      expect(result.maxWaveHeightMetres).toBe(3.5);
    });

    it('multiple warnings: uses highest non-null height → dangerous, maxWaveHeightMetres: 3.5', () => {
      const result = service.score(
        district,
        [makeWarning(1.5), makeWarning(3.5)],
        month,
      );
      expect(result.waveOps).toBe('dangerous');
      expect(result.maxWaveHeightMetres).toBe(3.5);
    });
  });

  describe('invalid month throws', () => {
    it('month 0 throws Error', () => {
      expect(() => service.score('Klang', [], 0)).toThrow(
        'month must be between 1 and 12',
      );
    });

    it('month 13 throws Error', () => {
      expect(() => service.score('Klang', [], 13)).toThrow(
        'month must be between 1 and 12',
      );
    });
  });
});
