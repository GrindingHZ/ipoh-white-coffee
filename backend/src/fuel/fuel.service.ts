import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveDieselRegion } from './fuel-region';

export interface FuelPriceInfo {
  ron95Price: number;
  ron95UnsubsidisedPrice: number | null;
  dieselPrice: number;
  dieselEastMsiaPrice: number | null;
  effectiveDate: Date;
}

export interface FuelPriceResponse {
  effectiveDate: string;
  ron95Price: number;
  dieselPrice: number;
}

@Injectable()
export class FuelService {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestPrice(): Promise<FuelPriceInfo | null> {
    const entry = await this.prisma.fuelPrice.findFirst({
      orderBy: { effectiveDate: 'desc' },
    });
    if (!entry) return null;
    return {
      ron95Price: Number(entry.ron95Price),
      ron95UnsubsidisedPrice:
        entry.ron95UnsubsidisedPrice !== null
          ? Number(entry.ron95UnsubsidisedPrice)
          : null,
      dieselPrice: Number(entry.dieselPrice),
      dieselEastMsiaPrice:
        entry.dieselEastMsiaPrice !== null
          ? Number(entry.dieselEastMsiaPrice)
          : null,
      effectiveDate: entry.effectiveDate,
    };
  }

  async getLatestPriceForLocality(
    locality?: string,
  ): Promise<FuelPriceResponse> {
    const latest = await this.getLatestPrice();
    if (!latest) throw new NotFoundException('No fuel price data available');

    const requestedRegion = resolveDieselRegion(locality);
    const hasEastMalaysiaPrice = latest.dieselEastMsiaPrice !== null;
    const dieselPrice =
      requestedRegion === 'east_malaysia' && hasEastMalaysiaPrice
        ? latest.dieselEastMsiaPrice!
        : latest.dieselPrice;

    return {
      effectiveDate: latest.effectiveDate.toISOString().slice(0, 10),
      ron95Price: latest.ron95Price,
      dieselPrice,
    };
  }

  async getPreviousWeekDieselPrice(locality?: string): Promise<number | null> {
    const entries = await this.prisma.fuelPrice.findMany({
      orderBy: { effectiveDate: 'desc' },
      take: 2,
    });
    if (entries.length < 2) return null;
    const prev = entries[1];
    const requestedRegion = resolveDieselRegion(locality);
    return requestedRegion === 'east_malaysia' && prev.dieselEastMsiaPrice !== null
      ? Number(prev.dieselEastMsiaPrice)
      : Number(prev.dieselPrice);
  }

  estimateTripCost(fuelCapacityLitres: number, ron95Price: number): number {
    return Math.round(fuelCapacityLitres * ron95Price * 100) / 100;
  }
}
