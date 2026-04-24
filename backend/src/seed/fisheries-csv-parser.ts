export interface FishPriceRow {
  weekLabel: string;
  approxWeekStart: Date;
  year: number;
  monthAbbr: string;
  weekInMonth: number;
  speciesMalay: string;
  speciesEnglish: string;
  wholesaleRmKg: number;
  retailRmKg: number;
  reportSource: string;
}

export interface MarinePriceRow {
  priceType: string;
  speciesMalay: string;
  month: number;
  monthNameMs: string;
  priceRmPerKg: number;
  annualAverageRmPerKg: number;
}

export interface MarineLandingStateRow {
  coast: string;
  state: string;
  month: number;
  monthNameMs: string;
  landingsTonnes: number;
}

export interface MarineLandingSpeciesRow {
  speciesMalay: string;
  month: number;
  monthNameMs: string;
  landingsTonnes: number;
}

export interface FishingEffortRow {
  coast: string;
  state: string;
  effortMetric: string;
  value: number;
}

export function parseFishPriceRows(csv: string): FishPriceRow[] {
  return parseCsv(csv).map((row) => ({
    weekLabel: row['week_label'],
    approxWeekStart: new Date(row['approx_week_start']),
    year: parseInt(row['year'], 10),
    monthAbbr: row['month_abbr'],
    weekInMonth: parseInt(row['week_in_month'], 10),
    speciesMalay: row['species_malay'],
    speciesEnglish: row['species_english'],
    wholesaleRmKg: parseFloat(row['wholesale_rm_kg']),
    retailRmKg: parseFloat(row['retail_rm_kg']),
    reportSource: row['report_source'],
  }));
}

export function parseMarinePriceRows(csv: string): MarinePriceRow[] {
  return parseCsv(csv).map((row) => ({
    priceType: row['price_type'],
    speciesMalay: row['species_malay'],
    month: parseInt(row['month'], 10),
    monthNameMs: row['month_name_ms'],
    priceRmPerKg: parseFloat(row['price_rm_per_kg']),
    annualAverageRmPerKg: parseFloat(row['annual_average_rm_per_kg']),
  }));
}

export function parseMarineLandingStateRows(
  csv: string,
): MarineLandingStateRow[] {
  return parseCsv(csv).map((row) => ({
    coast: row['coast'],
    state: row['state'],
    month: parseInt(row['month'], 10),
    monthNameMs: row['month_name_ms'],
    landingsTonnes: parseFloat(row['landings_tonnes']),
  }));
}

export function parseMarineLandingSpeciesRows(
  csv: string,
): MarineLandingSpeciesRow[] {
  return parseCsv(csv).map((row) => ({
    speciesMalay: row['species_malay'],
    month: parseInt(row['month'], 10),
    monthNameMs: row['month_name_ms'],
    landingsTonnes: parseFloat(row['landings_tonnes']),
  }));
}

export function parseFishingEffortRows(csv: string): FishingEffortRow[] {
  return parseCsv(csv).map((row) => ({
    coast: row['coast'],
    state: row['state'],
    effortMetric: row['effort_metric'],
    value: parseInt(row['value'], 10),
  }));
}

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? '']),
    );
  });
}
