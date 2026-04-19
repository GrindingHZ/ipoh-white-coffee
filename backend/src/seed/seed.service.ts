import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { parseLatestFuelPrice } from './fuel-csv-parser';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seed() {
    await Promise.all([this.seedTides(), this.seedFuel(), this.seedSeasonalPatterns()]);
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
        where: { district_date: { district: row.district, date: new Date(row.date) } },
        create: { district: row.district, date: new Date(row.date), ...tideData },
        update: tideData,
      });
    }
    this.logger.log(`Seeded ${rows.length} tide entries`);
  }

  private async seedFuel() {
    const csv = this.readData('fuel-prices.csv');
    const row = parseLatestFuelPrice(csv);
    if (!row) {
      this.logger.warn('No valid fuel price row found in fuel-prices.csv');
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
        where: { species_month_district: { species: item.species, month: item.month, district: item.district } },
        create: { species: item.species, month: item.month, district: item.district, activityLevel: item.activityLevel, notes: item.notes ?? null },
        update: { activityLevel: item.activityLevel, notes: item.notes ?? null },
      });
    }
    this.logger.log(`Seeded ${json.length} seasonal pattern entries`);
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
