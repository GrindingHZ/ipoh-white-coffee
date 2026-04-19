import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TideInfo {
  highTime: string | null;
  highHeight: number | null;
  lowTime: string | null;
  lowHeight: number | null;
  stateAtHour: 'rising' | 'falling' | 'unknown';
}

@Injectable()
export class TideService {
  constructor(private readonly prisma: PrismaService) {}

  async getTideForDay(district: string, date: Date): Promise<TideInfo | null> {
    const entry = await this.prisma.tideEntry.findFirst({
      where: {
        district,
        date: new Date(date.toISOString().slice(0, 10)),
      },
    });

    if (!entry) return null;

    return {
      highTime: entry.highTime,
      highHeight: entry.highHeight ? Number(entry.highHeight) : null,
      lowTime: entry.lowTime,
      lowHeight: entry.lowHeight ? Number(entry.lowHeight) : null,
      stateAtHour: this.computeState(entry.highTime, entry.lowTime, date.getHours()),
    };
  }

  private computeState(
    highTime: string | null,
    lowTime: string | null,
    hour: number,
  ): 'rising' | 'falling' | 'unknown' {
    if (!highTime || !lowTime) return 'unknown';
    const highH = parseInt(highTime.split(':')[0], 10);
    const lowH = parseInt(lowTime.split(':')[0], 10);
    if (lowH < highH) {
      return hour < lowH || hour > highH ? 'rising' : 'falling';
    }
    return hour < highH ? 'rising' : 'falling';
  }
}
