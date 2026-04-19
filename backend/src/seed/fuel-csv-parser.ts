export interface FuelPriceRow {
  effectiveDate: Date;
  ron95Price: number;
  ron95UnsubsidisedPrice: number;
  dieselPrice: number;
  dieselEastMsiaPrice: number;
}

export function parseLatestFuelPrice(csv: string): FuelPriceRow | null {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return null;

  const headers = lines[0].split(',').map((h) => h.trim());

  const rows = lines
    .slice(1)
    .map((line) => {
      const values = line.split(',').map((v) => v.trim());
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    })
    .filter(
      (row) => row['series_type'] === 'level' && row['ron95_budi95'] !== '',
    )
    .sort((a, b) => b['date'].localeCompare(a['date']));

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    effectiveDate: new Date(row['date']),
    ron95Price: parseFloat(row['ron95_budi95']),
    ron95UnsubsidisedPrice: parseFloat(row['ron95']),
    dieselPrice: parseFloat(row['diesel']),
    dieselEastMsiaPrice: parseFloat(row['diesel_eastmsia']),
  };
}
