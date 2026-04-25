import { ContextAssemblerService } from './context-assembler.service';

describe('ContextAssemblerService', () => {
  it('calls subagents for evidence slices and assembles compact structured prompt', async () => {
    const weather = {
      getActiveWarnings: jest.fn().mockResolvedValue([
        {
          title_en: 'Strong winds advisory',
          valid_to: '2026-04-16T12:00:00.000Z',
          waveHeightMetres: 2.4,
        },
      ]),
      getForecastForTripWindow: jest.fn().mockResolvedValue({
        slot: '06:00-09:00',
        value: 'Thunderstorm risk low, winds moderate.',
      }),
    };
    const tide = {
      getTideForDay: jest.fn().mockResolvedValue({
        stateAtHour: 'rising',
        highHeight: 2.4,
        highTime: '08:10',
        lowHeight: 0.6,
        lowTime: '15:40',
      }),
    };
    const fuel = {
      getLatestPriceForLocality: jest.fn().mockResolvedValue({
        effectiveDate: '2026-04-16',
        ron95Price: 1.99,
        dieselPrice: 2.15,
      }),
      getPreviousWeekDieselPrice: jest.fn().mockResolvedValue(2.1),
    };
    const signals = {
      score: jest.fn().mockReturnValue({
        coastType: 'borneo',
        monsoonFlag: 'favorable',
        waveOps: 'caution',
        maxWaveHeightMetres: 2.4,
        monsoonImpactNote: 'Borneo Mar-Oct operating window.',
        operabilityNote: 'Waves are near operational caution threshold.',
        coastProfileNote: 'Sabah, Sarawak, and Labuan fisheries.',
      }),
    };
    const prisma = {
      seasonalPattern: { findMany: jest.fn().mockResolvedValue([]) },
      marineLandingStateMonthly: {
        findMany: jest.fn().mockResolvedValue([
          {
            month: 4,
            coast: 'borneo',
            landingsTonnes: { toNumber: () => 1200 },
          },
        ]),
      },
    };
    const glm = {
      completeSlice: jest.fn().mockImplementation(async (slice: string) => ({
        slice,
        score: 0.7,
        confidence: 0.8,
        riskLevel: 'medium',
        summary: `${slice} structured summary`,
        supportingFacts: [`${slice} fact`],
        metrics: { sample: `${slice}-metric` },
        dataGaps: [`${slice} gap`],
      })),
    };

    const service = new ContextAssemblerService(
      weather as any,
      tide as any,
      fuel as any,
      signals as any,
      prisma as any,
      glm as any,
    );

    const prompt = await service.assemble(
      {
        language: 'en',
        typicalDepartureTime: '06:00',
        fuelCapacity: 40,
        targetSpecies: [],
      } as any,
      'Sandakan',
      new Date('2026-04-16T06:00:00.000Z'),
    );

    const calledSliceIds = glm.completeSlice.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(calledSliceIds).toEqual([
      'weather',
      'timing',
      'tide',
      'fuel',
      'seasonal',
      'landings',
    ]);
    expect(glm.completeSlice).not.toHaveBeenCalledWith(
      'language',
      expect.anything(),
    );

    const weatherCall = glm.completeSlice.mock.calls.find(
      (call: unknown[]) => call[0] === 'weather',
    );
    const fuelCall = glm.completeSlice.mock.calls.find(
      (call: unknown[]) => call[0] === 'fuel',
    );

    expect(weatherCall?.[1]).toContain('Active weather warnings:');
    expect(weatherCall?.[1]).toContain('Weather forecast for Sandakan');
    expect(fuelCall?.[1]).toContain('Boat fuel (diesel): RM2.15/L');
    expect(fuelCall?.[1]).toContain('estimated RM86.00 for a full tank (40L)');

    expect(prompt).toContain('Respond in English.');
    expect(prompt).toContain('Structured slice analyses (compact JSON):');
    expect(prompt).toContain('"slice":"weather"');
    expect(prompt).toContain('"summary":"weather structured summary"');
    expect(prompt).not.toContain('Weather forecast for Sandakan (06:00-09:00)');
    expect(prompt).not.toContain('Estimated round-trip fuel cost: RM86.00');
  });

  it('skips empty raw slices instead of calling subagents with no evidence', async () => {
    const weather = {
      getActiveWarnings: jest.fn().mockResolvedValue([]),
      getForecastForTripWindow: jest.fn().mockResolvedValue(null),
    };
    const tide = {
      getTideForDay: jest.fn().mockResolvedValue(null),
    };
    const fuel = {
      getLatestPriceForLocality: jest.fn().mockResolvedValue(null),
      getPreviousWeekDieselPrice: jest.fn().mockResolvedValue(null),
    };
    const signals = {
      score: jest.fn().mockReturnValue({
        coastType: 'peninsular',
        monsoonFlag: 'neutral',
        waveOps: 'safe',
        maxWaveHeightMetres: null,
        monsoonImpactNote: 'Neutral monsoon impact.',
        operabilityNote: 'No active warning indicates waves above 2.0m.',
        coastProfileNote: 'Peninsular fisheries profile.',
      }),
    };
    const prisma = {
      seasonalPattern: { findMany: jest.fn().mockResolvedValue([]) },
      marineLandingStateMonthly: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const glm = {
      completeSlice: jest.fn().mockImplementation(async (slice: string) => ({
        slice,
        score: 0.6,
        confidence: 0.7,
        riskLevel: 'low',
        summary: `${slice} summary`,
        supportingFacts: [],
        metrics: {},
        dataGaps: ['limited data'],
      })),
    };

    const service = new ContextAssemblerService(
      weather as any,
      tide as any,
      fuel as any,
      signals as any,
      prisma as any,
      glm as any,
    );

    await service.assemble(
      {
        language: 'en',
        typicalDepartureTime: '06:00',
        fuelCapacity: 40,
        targetSpecies: [],
      } as any,
      'Unknown District',
      new Date('2026-04-16T06:00:00.000Z'),
    );

    const calledSliceIds = glm.completeSlice.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(calledSliceIds).toEqual(['timing', 'tide', 'seasonal']);
  });

  it('retries a failed slice subagent call once before succeeding', async () => {
    const weather = {
      getActiveWarnings: jest.fn().mockResolvedValue([]),
      getForecastForTripWindow: jest.fn().mockResolvedValue({
        slot: '06:00-09:00',
        value: 'Stable sea and cloud cover.',
      }),
    };
    const tide = {
      getTideForDay: jest.fn().mockResolvedValue(null),
    };
    const fuel = {
      getLatestPriceForLocality: jest.fn().mockResolvedValue(null),
      getPreviousWeekDieselPrice: jest.fn().mockResolvedValue(null),
    };
    const signals = {
      score: jest.fn().mockReturnValue({
        coastType: 'peninsular',
        monsoonFlag: 'neutral',
        waveOps: 'safe',
        maxWaveHeightMetres: null,
        monsoonImpactNote: 'Neutral monsoon impact.',
        operabilityNote: 'No active warning indicates waves above 2.0m.',
        coastProfileNote: 'Peninsular fisheries profile.',
      }),
    };
    const prisma = {
      seasonalPattern: { findMany: jest.fn().mockResolvedValue([]) },
      marineLandingStateMonthly: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const attemptsBySlice: Record<string, number> = {};
    const glm = {
      completeSlice: jest.fn().mockImplementation(async (slice: string) => {
        attemptsBySlice[slice] = (attemptsBySlice[slice] ?? 0) + 1;

        if (slice === 'weather' && attemptsBySlice[slice] === 1) {
          throw new Error('temporary upstream error');
        }

        return {
          slice,
          score: 0.6,
          confidence: 0.7,
          riskLevel: 'low',
          summary: `${slice} summary`,
          supportingFacts: [],
          metrics: {},
          dataGaps: [],
        };
      }),
    };

    const service = new ContextAssemblerService(
      weather as any,
      tide as any,
      fuel as any,
      signals as any,
      prisma as any,
      glm as any,
    );

    const prompt = await service.assemble(
      {
        language: 'en',
        typicalDepartureTime: '06:00',
        fuelCapacity: 40,
        targetSpecies: [],
      } as any,
      'Unknown District',
      new Date('2026-04-16T06:00:00.000Z'),
    );

    expect(attemptsBySlice.weather).toBe(2);
    expect(prompt).toContain('"slice":"weather"');
  });
});
