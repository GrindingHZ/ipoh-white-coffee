import {
  parseFishPriceRows,
  parseFishingEffortRows,
  parseMarineLandingSpeciesRows,
  parseMarineLandingStateRows,
  parseMarinePriceRows,
} from './fisheries-csv-parser';

describe('fisheries CSV parser', () => {
  it('parses weekly LKIM fish pricing rows', () => {
    const csv = `week_label,approx_week_start,year,month_abbr,week_in_month,species_malay,species_english,wholesale_rm_kg,retail_rm_kg,report_source
2026-JAN-W1,2026-01-01,2026,JAN,1,UDANG PUTIH BESAR,Large White Shrimp,47.76,55.57,M01.JAN_1.2026`;

    expect(parseFishPriceRows(csv)).toEqual([
      {
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
    ]);
  });

  it('parses monthly DOF marine price rows', () => {
    const csv = `price_type,species_malay,month,month_name_ms,price_rm_per_kg,annual_average_rm_per_kg
retail,Yu,12,Disember,9.23,9.0`;

    expect(parseMarinePriceRows(csv)).toEqual([
      {
        priceType: 'retail',
        speciesMalay: 'Yu',
        month: 12,
        monthNameMs: 'Disember',
        priceRmPerKg: 9.23,
        annualAverageRmPerKg: 9,
      },
    ]);
  });

  it('parses monthly DOF state landing rows', () => {
    const csv = `coast,state,month,month_name_ms,landings_tonnes
borneo,W.P. Labuan,12,Disember,1183`;

    expect(parseMarineLandingStateRows(csv)).toEqual([
      {
        coast: 'borneo',
        state: 'W.P. Labuan',
        month: 12,
        monthNameMs: 'Disember',
        landingsTonnes: 1183,
      },
    ]);
  });

  it('parses monthly DOF species landing rows', () => {
    const csv = `species_malay,month,month_name_ms,landings_tonnes
Belut,2,Februari,0.48`;

    expect(parseMarineLandingSpeciesRows(csv)).toEqual([
      {
        speciesMalay: 'Belut',
        month: 2,
        monthNameMs: 'Februari',
        landingsTonnes: 0.48,
      },
    ]);
  });

  it('parses DOF fishing effort state totals', () => {
    const csv = `coast,state,effort_metric,value
west,Perlis,fishing_units,3710`;

    expect(parseFishingEffortRows(csv)).toEqual([
      {
        coast: 'west',
        state: 'Perlis',
        effortMetric: 'fishing_units',
        value: 3710,
      },
    ]);
  });
});
