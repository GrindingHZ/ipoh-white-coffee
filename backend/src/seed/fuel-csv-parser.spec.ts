import { parseLatestFuelPrice } from './fuel-csv-parser';

const HEADER = 'series_type,date,ron95,ron97,diesel,diesel_eastmsia,ron95_budi95,ron95_skps';

describe('parseLatestFuelPrice', () => {
  it('returns null when no data rows exist', () => {
    expect(parseLatestFuelPrice(`${HEADER}\n`)).toBeNull();
  });

  it('ignores change_weekly rows', () => {
    const csv = `${HEADER}
change_weekly,2026-04-16,4.02,5.1,5.97,2.15,1.99,2.05`;
    expect(parseLatestFuelPrice(csv)).toBeNull();
  });

  it('ignores level rows with empty ron95_budi95', () => {
    const csv = `${HEADER}
level,2024-01-01,2.05,2.40,2.15,2.15,,`;
    expect(parseLatestFuelPrice(csv)).toBeNull();
  });

  it('returns the most recent valid row', () => {
    const csv = `${HEADER}
level,2026-04-09,4.27,5.35,6.72,2.15,1.99,2.05
level,2026-04-16,4.02,5.1,5.97,2.15,1.99,2.05`;
    expect(parseLatestFuelPrice(csv)).toEqual({
      effectiveDate: new Date('2026-04-16'),
      ron95Price: 1.99,
      ron95UnsubsidisedPrice: 4.02,
      dieselPrice: 5.97,
      dieselEastMsiaPrice: 2.15,
    });
  });

  it('picks most recent even when rows are out of order', () => {
    const csv = `${HEADER}
level,2026-04-16,4.02,5.1,5.97,2.15,1.99,2.05
level,2026-04-09,4.27,5.35,6.72,2.15,1.99,2.05`;
    const result = parseLatestFuelPrice(csv);
    expect(result?.effectiveDate).toEqual(new Date('2026-04-16'));
  });
});
