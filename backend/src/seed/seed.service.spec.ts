import { SeedService } from './seed.service';

describe('SeedService', () => {
  let prisma: {
    tideEntry: { upsert: jest.Mock };
    fuelPrice: { upsert: jest.Mock };
    seasonalPattern: { upsert: jest.Mock };
    fishLanding: { upsert: jest.Mock };
    fishPrice: { upsert: jest.Mock };
    marinePrice: { upsert: jest.Mock };
    marineLandingStateMonthly: { upsert: jest.Mock };
    marineLandingSpeciesMonthly: { upsert: jest.Mock };
    fishingEffortStateTotal: { upsert: jest.Mock };
  };
  let service: SeedService;

  beforeEach(() => {
    prisma = {
      tideEntry: { upsert: jest.fn() },
      fuelPrice: { upsert: jest.fn() },
      seasonalPattern: { upsert: jest.fn() },
      fishLanding: { upsert: jest.fn() },
      fishPrice: { upsert: jest.fn() },
      marinePrice: { upsert: jest.fn() },
      marineLandingStateMonthly: { upsert: jest.fn() },
      marineLandingSpeciesMonthly: { upsert: jest.fn() },
      fishingEffortStateTotal: { upsert: jest.fn() },
    };
    service = new SeedService(prisma as never);

    jest.spyOn(service as never, 'readData').mockImplementation(((filename: string) => {
      const fixtures: Record<string, string> = {
        'tide-tables.csv': `district,date,high_time,high_height,low_time,low_height
Kuantan,2026-01-01,08:00,2.5,14:00,0.7`,
        'fuelprice.csv': `date,series_type,ron95,ron97,diesel,diesel_euro5,ron95_budi95,diesel_eastmsia
2026-01-01,level,2.60,3.50,2.15,2.35,1.99,2.05`,
        'seasonal-patterns.json':
          '[{"species":"Siakap","month":1,"district":"Kuantan","activityLevel":"high","notes":"peak"}]',
        'fish_landings.csv': `date,coast,state,landings
2026-01-01,east,Pahang,12345`,
        'fish-pricing.csv': `week_label,approx_week_start,year,month_abbr,week_in_month,species_malay,species_english,wholesale_rm_kg,retail_rm_kg,report_source
2026-JAN-W1,2026-01-01,2026,JAN,1,UDANG PUTIH BESAR,Large White Shrimp,47.76,55.57,M01.JAN_1.2026`,
        'marine-prices-2024-monthly.csv': `price_type,species_malay,month,month_name_ms,price_rm_per_kg,annual_average_rm_per_kg
retail,Yu,12,Disember,9.23,9.0`,
        'marine-landings-2024-state-month.csv': `coast,state,month,month_name_ms,landings_tonnes
borneo,W.P. Labuan,12,Disember,1183`,
        'marine-landings-2024-species-month.csv': `species_malay,month,month_name_ms,landings_tonnes
Belut,2,Februari,0.48`,
        'fishing-effort-2024-state-totals.csv': `coast,state,effort_metric,value
west,Perlis,fishing_units,3710`,
      };
      return fixtures[filename] ?? '';
    }) as never);
  });

  it('seeds all new fisheries datasets with stable upsert keys', async () => {
    await service.seed();

    expect(prisma.fishPrice.upsert).toHaveBeenCalledWith({
      where: {
        weekLabel_speciesMalay: {
          weekLabel: '2026-JAN-W1',
          speciesMalay: 'UDANG PUTIH BESAR',
        },
      },
      create: {
        weekLabel: '2026-JAN-W1',
        approxWeekStart: new Date('2026-01-01'),
        year: 2026,
        monthAbbr: 'JAN',
        weekInMonth: 1,
        speciesMalay: 'UDANG PUTIH BESAR',
        speciesEnglish: 'Large White Shrimp',
        wholesaleRmKg: 47.76,
        retailRmKg: 55.57,
        reportSource: 'M01.JAN_1.2026',
      },
      update: {
        approxWeekStart: new Date('2026-01-01'),
        year: 2026,
        monthAbbr: 'JAN',
        weekInMonth: 1,
        speciesEnglish: 'Large White Shrimp',
        wholesaleRmKg: 47.76,
        retailRmKg: 55.57,
        reportSource: 'M01.JAN_1.2026',
      },
    });

    expect(prisma.marinePrice.upsert).toHaveBeenCalledWith({
      where: {
        priceType_speciesMalay_month: {
          priceType: 'retail',
          speciesMalay: 'Yu',
          month: 12,
        },
      },
      create: {
        priceType: 'retail',
        speciesMalay: 'Yu',
        month: 12,
        monthNameMs: 'Disember',
        priceRmPerKg: 9.23,
        annualAverageRmPerKg: 9,
      },
      update: {
        monthNameMs: 'Disember',
        priceRmPerKg: 9.23,
        annualAverageRmPerKg: 9,
      },
    });

    expect(prisma.marineLandingStateMonthly.upsert).toHaveBeenCalledWith({
      where: {
        coast_state_month: {
          coast: 'borneo',
          state: 'W.P. Labuan',
          month: 12,
        },
      },
      create: {
        coast: 'borneo',
        state: 'W.P. Labuan',
        month: 12,
        monthNameMs: 'Disember',
        landingsTonnes: 1183,
      },
      update: { monthNameMs: 'Disember', landingsTonnes: 1183 },
    });

    expect(prisma.marineLandingSpeciesMonthly.upsert).toHaveBeenCalledWith({
      where: { speciesMalay_month: { speciesMalay: 'Belut', month: 2 } },
      create: {
        speciesMalay: 'Belut',
        month: 2,
        monthNameMs: 'Februari',
        landingsTonnes: 0.48,
      },
      update: { monthNameMs: 'Februari', landingsTonnes: 0.48 },
    });

    expect(prisma.fishingEffortStateTotal.upsert).toHaveBeenCalledWith({
      where: {
        coast_state_effortMetric: {
          coast: 'west',
          state: 'Perlis',
          effortMetric: 'fishing_units',
        },
      },
      create: {
        coast: 'west',
        state: 'Perlis',
        effortMetric: 'fishing_units',
        value: 3710,
      },
      update: { value: 3710 },
    });
  });
});
