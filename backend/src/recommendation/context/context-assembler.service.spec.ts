import { ContextAssemblerService } from './context-assembler.service';

describe('ContextAssemblerService', () => {
  it('uses locality-specific diesel pricing in the fuel prompt slice', async () => {
    const weather = {
      getActiveWarnings: jest.fn().mockResolvedValue([]),
      getForecastForTripWindow: jest.fn().mockResolvedValue(null),
    };
    const tide = { getTideForDay: jest.fn().mockResolvedValue(null) };
    const fuel = {
      getLatestPrice: jest.fn().mockResolvedValue({
        ron95Price: 1.99,
        dieselPrice: 5.97,
        effectiveDate: new Date('2026-04-16T00:00:00.000Z'),
      }),
      getLatestPriceForLocality: jest.fn().mockResolvedValue({
        effectiveDate: '2026-04-16',
        ron95Price: 1.99,
        dieselPrice: 2.15,
      }),
    };
    const signals = {
      score: jest.fn().mockReturnValue({
        coastType: 'borneo',
        monsoonFlag: 'favorable',
        waveOps: 'safe',
        maxWaveHeightMetres: null,
        monsoonImpactNote: 'Borneo Mar-Oct operating window.',
        operabilityNote: 'No active warning indicates waves above 2.0m.',
        coastProfileNote: 'Sabah, Sarawak, and Labuan fisheries.',
      }),
    };
    const prisma = {
      seasonalPattern: { findMany: jest.fn().mockResolvedValue([]) },
      marineLandingStateMonthly: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ContextAssemblerService(
      weather as any,
      tide as any,
      fuel as any,
      signals as any,
      prisma as any,
    );

    const prompt = await service.assemble(
      {
        language: 'en',
        typicalDepartureTime: '06:00',
        fuelCapacity: 40,
        targetSpecies: [],
      } as any,
      'SND',
      'Sandakan',
      new Date('2026-04-16T06:00:00.000Z'),
    );

    expect(fuel.getLatestPriceForLocality).toHaveBeenCalledWith('Sandakan');
    expect(prompt).toContain('Diesel: RM2.15/litre');
    expect(prompt).toContain('Estimated round-trip fuel cost: RM86.00');
  });
});
