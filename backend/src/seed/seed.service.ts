import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { parseLatestFuelPrice } from './fuel-csv-parser';
import {
  parseFishPriceRows,
  parseFishingEffortRows,
  parseMarineLandingSpeciesRows,
  parseMarineLandingStateRows,
  parseMarinePriceRows,
} from './fisheries-csv-parser';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    await Promise.all([
      this.seedTides(),
      this.seedFuel(),
      this.seedSeasonalPatterns(),
      this.seedFishLandings(),
      this.seedFishPrices(),
      this.seedMarinePrices(),
      this.seedMarineLandingStateMonthly(),
      this.seedMarineLandingSpeciesMonthly(),
      this.seedFishingEffortStateTotals(),
    ]);
    this.logger.log('Seeding complete');
  }

  private async seedTides() {
    const csv = this.readData('tide-tables.csv');
    const rows = this.parseCsv(csv);
    for (const row of rows) {
      const tideData = {
        highTime: row.high_time || null,
        highHeight: row.high_height ? parseFloat(row.high_height) : null,
        lowTime: row.low_time || null,
        lowHeight: row.low_height ? parseFloat(row.low_height) : null,
      };
      await this.prisma.tideEntry.upsert({
        where: {
          district_date: { district: row.district, date: new Date(row.date) },
        },
        create: {
          district: row.district,
          date: new Date(row.date),
          ...tideData,
        },
        update: tideData,
      });
    }
    this.logger.log(`Seeded ${rows.length} tide entries`);
  }

  private async seedFuel() {
    const csv = this.readData('fuelprice.csv');
    const row = parseLatestFuelPrice(csv);
    if (!row) {
      this.logger.warn('No valid fuel price row found in fuelprice.csv');
      return;
    }
    const priceData = {
      ron95Price: row.ron95Price,
      ron95UnsubsidisedPrice: row.ron95UnsubsidisedPrice,
      dieselPrice: row.dieselPrice,
      dieselEastMsiaPrice: row.dieselEastMsiaPrice,
    };
    await this.prisma.fuelPrice.upsert({
      where: { effectiveDate: row.effectiveDate },
      create: { effectiveDate: row.effectiveDate, ...priceData },
      update: priceData,
    });
    this.logger.log('Seeded 1 fuel price entry');
  }

  private async seedSeasonalPatterns() {
    const json = JSON.parse(this.readData('seasonal-patterns.json'));
    for (const item of json) {
      await this.prisma.seasonalPattern.upsert({
        where: {
          species_month_district: {
            species: item.species,
            month: item.month,
            district: item.district,
          },
        },
        create: {
          species: item.species,
          month: item.month,
          district: item.district,
          activityLevel: item.activityLevel,
          notes: item.notes ?? null,
        },
        update: {
          activityLevel: item.activityLevel,
          notes: item.notes ?? null,
        },
      });
    }
    this.logger.log(`Seeded ${json.length} seasonal pattern entries`);
  }

  private async seedFishLandings() {
    const csv = this.readData('fish_landings.csv');
    const rows = this.parseCsv(csv);
    let count = 0;
    for (const row of rows) {
      if (row.coast === 'all') continue;
      const date = new Date(row.date);
      const landingsKg = parseInt(row.landings, 10);
      await this.prisma.fishLanding.upsert({
        where: {
          date_coast_state: { date, coast: row.coast, state: row.state },
        },
        create: { date, coast: row.coast, state: row.state, landingsKg },
        update: { landingsKg },
      });
      count++;
    }
    this.logger.log(`Seeded ${count} fish landing entries`);
  }

  private async seedFishPrices() {
    const csv = this.readData('fish-pricing.csv');
    const rows = parseFishPriceRows(csv);
    for (const row of rows) {
      const priceData = {
        approxWeekStart: row.approxWeekStart,
        year: row.year,
        monthAbbr: row.monthAbbr,
        weekInMonth: row.weekInMonth,
        speciesEnglish: row.speciesEnglish,
        wholesaleRmKg: row.wholesaleRmKg,
        retailRmKg: row.retailRmKg,
        reportSource: row.reportSource,
      };
      await this.prisma.fishPrice.upsert({
        where: {
          weekLabel_speciesMalay: {
            weekLabel: row.weekLabel,
            speciesMalay: row.speciesMalay,
          },
        },
        create: {
          weekLabel: row.weekLabel,
          speciesMalay: row.speciesMalay,
          ...priceData,
        },
        update: priceData,
      });
    }
    this.logger.log(`Seeded ${rows.length} fish price entries`);
  }

  private async seedMarinePrices() {
    const csv = this.readData('marine-prices-2024-monthly.csv');
    const rows = parseMarinePriceRows(csv);
    for (const row of rows) {
      const priceData = {
        monthNameMs: row.monthNameMs,
        priceRmPerKg: row.priceRmPerKg,
        annualAverageRmPerKg: row.annualAverageRmPerKg,
      };
      await this.prisma.marinePrice.upsert({
        where: {
          priceType_speciesMalay_month: {
            priceType: row.priceType,
            speciesMalay: row.speciesMalay,
            month: row.month,
          },
        },
        create: {
          priceType: row.priceType,
          speciesMalay: row.speciesMalay,
          month: row.month,
          ...priceData,
        },
        update: priceData,
      });
    }
    this.logger.log(`Seeded ${rows.length} marine price entries`);
  }

  private async seedMarineLandingStateMonthly() {
    const csv = this.readData('marine-landings-2024-state-month.csv');
    const rows = parseMarineLandingStateRows(csv);
    for (const row of rows) {
      const landingData = {
        monthNameMs: row.monthNameMs,
        landingsTonnes: row.landingsTonnes,
      };
      await this.prisma.marineLandingStateMonthly.upsert({
        where: {
          coast_state_month: {
            coast: row.coast,
            state: row.state,
            month: row.month,
          },
        },
        create: {
          coast: row.coast,
          state: row.state,
          month: row.month,
          ...landingData,
        },
        update: landingData,
      });
    }
    this.logger.log(`Seeded ${rows.length} marine state landing entries`);
  }

  private async seedMarineLandingSpeciesMonthly() {
    const csv = this.readData('marine-landings-2024-species-month.csv');
    const rows = parseMarineLandingSpeciesRows(csv);
    for (const row of rows) {
      const landingData = {
        monthNameMs: row.monthNameMs,
        landingsTonnes: row.landingsTonnes,
      };
      await this.prisma.marineLandingSpeciesMonthly.upsert({
        where: {
          speciesMalay_month: {
            speciesMalay: row.speciesMalay,
            month: row.month,
          },
        },
        create: {
          speciesMalay: row.speciesMalay,
          month: row.month,
          ...landingData,
        },
        update: landingData,
      });
    }
    this.logger.log(`Seeded ${rows.length} marine species landing entries`);
  }

  private async seedFishingEffortStateTotals() {
    const csv = this.readData('fishing-effort-2024-state-totals.csv');
    const rows = parseFishingEffortRows(csv);
    for (const row of rows) {
      await this.prisma.fishingEffortStateTotal.upsert({
        where: {
          coast_state_effortMetric: {
            coast: row.coast,
            state: row.state,
            effortMetric: row.effortMetric,
          },
        },
        create: row,
        update: { value: row.value },
      });
    }
    this.logger.log(`Seeded ${rows.length} fishing effort entries`);
  }

  private readData(filename: string): string {
    const filePath = path.join(__dirname, '..', 'data', filename);
    return fs.readFileSync(filePath, 'utf-8');
  }

  private parseCsv(csv: string): Record<string, string>[] {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim());
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });
  }
}
