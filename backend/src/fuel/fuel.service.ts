import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FuelPriceInfo {
  ron95Price: number;
  ron95UnsubsidisedPrice: number | null;
  dieselPrice: number;
  dieselEastMsiaPrice: number | null;
  effectiveDate: Date;
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

  estimateTripCost(fuelCapacityLitres: number, ron95Price: number): number {
    return Math.round(fuelCapacityLitres * ron95Price * 100) / 100;
  }
}
