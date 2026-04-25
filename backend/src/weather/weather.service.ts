import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  THUNDERSTORM_EN,
  THUNDERSTORM_BM,
  THUNDERSTORM_FORECAST_PREFIX,
  ForecastSlot,
  SLOT_HOUR_RANGES,
} from '../data/forecast-values';

export interface Warning {
  title_en: string;
  title_bm: string;
  text_en: string;
  text_bm: string;
  valid_from: string;
  valid_to: string;
  isThunderstorm: boolean;
  waveHeightMetres: number | null;
}

export interface ForecastSlotResult {
  slot: ForecastSlot;
  value: string;
  isThunderstorm: boolean;
}

const FORECAST_TTL_MS = 2 * 60 * 60 * 1000;
const WARNING_TTL_MS = 15 * 60 * 1000;
const DATA_GOV_BASE = 'https://api.data.gov.my';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActiveWarnings(state: string): Promise<Warning[]> {
    const cacheEntry = await this.getCacheEntry('warning', state);
    let payload: any[];

    if (cacheEntry && this.isFresh(cacheEntry.fetchedAt, WARNING_TTL_MS)) {
      payload = cacheEntry.payload as any[];
    } else {
      try {
        payload = await this.fetchWarnings();
        await this.upsertCache('warning', state, payload);
      } catch (err) {
        this.logger.warn(`Warning fetch failed: ${err.message}`);
        if (cacheEntry) {
          payload = cacheEntry.payload as any[];
        } else {
          throw new Error('NO_CACHE');
        }
      }
    }

    const now = new Date();
    return payload
      .filter((w) => {
        if (!w.valid_from || !w.valid_to) return false;
        if (new Date(w.valid_to) <= now) return false;
        const text = `${w.text_en ?? ''} ${w.text_bm ?? ''}`.toLowerCase();
        const stateLower = state.toLowerCase();
        return text.includes(stateLower);
      })
      .map((w) => ({
        title_en: w.title_en ?? '',
        title_bm: w.title_bm ?? '',
        text_en: w.text_en ?? '',
        text_bm: w.text_bm ?? '',
        valid_from: w.valid_from,
        valid_to: w.valid_to,
        isThunderstorm:
          (w.title_en ?? '').includes(THUNDERSTORM_EN) ||
          (w.title_bm ?? '').includes(THUNDERSTORM_BM),
        waveHeightMetres: this.parseWaveHeight(w.text_en ?? ''),
      }));
  }

  async getForecastForTripWindow(
    locationId: string,
    date: Date,
    departureHour: number,
  ): Promise<ForecastSlotResult | null> {
    const district = this.districtFromLocationId(locationId);
    const cacheEntry = await this.getCacheEntry('forecast', district);
    let payload: any;

    if (cacheEntry && this.isFresh(cacheEntry.fetchedAt, FORECAST_TTL_MS)) {
      payload = cacheEntry.payload;
    } else {
      try {
        payload = await this.fetchForecast(locationId, date);
        await this.upsertCache('forecast', district, payload);
      } catch (err) {
        this.logger.warn(`Forecast fetch failed: ${err.message}`);
        if (cacheEntry) {
          payload = cacheEntry.payload;
        } else {
          throw new Error('NO_CACHE');
        }
      }
    }

    const slot = this.hourToSlot(departureHour);
    const value = this.extractSlotValue(payload, slot);
    if (!value) return null;

    return {
      slot,
      value,
      isThunderstorm: value.startsWith(THUNDERSTORM_FORECAST_PREFIX),
    };
  }

  private async fetchWarnings(): Promise<any[]> {
    const res = await fetch(`${DATA_GOV_BASE}/weather/warning`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return Array.isArray(json) ? json : (json.data ?? []);
  }

  private async fetchForecast(locationId: string, date: Date): Promise<any> {
    const dateStr = date.toISOString().slice(0, 10);
    const res = await fetch(
      `${DATA_GOV_BASE}/weather/forecast?contains=${locationId}@location__location_id&date=${dateStr}`,
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  private async getCacheEntry(type: string, district: string) {
    return this.prisma.weatherCache.findFirst({
      where: { type, district },
      orderBy: { fetchedAt: 'desc' },
    });
  }

  private async upsertCache(type: string, district: string, payload: any) {
    await this.prisma.weatherCache.upsert({
      where: { type_district: { type, district } },
      create: { type, district, payload },
      update: { payload, fetchedAt: new Date() },
    });
  }

  private isFresh(fetchedAt: Date, ttlMs: number): boolean {
    return Date.now() - fetchedAt.getTime() < ttlMs;
  }

  private parseWaveHeight(text: string): number | null {
    const match = text.match(/wave height up to (\d+(?:\.\d+)?)m/i);
    return match ? parseFloat(match[1]) : null;
  }

  private hourToSlot(hour: number): ForecastSlot {
    if (
      hour >= SLOT_HOUR_RANGES.morning[0] &&
      hour < SLOT_HOUR_RANGES.morning[1]
    )
      return 'morning';
    if (
      hour >= SLOT_HOUR_RANGES.afternoon[0] &&
      hour < SLOT_HOUR_RANGES.afternoon[1]
    )
      return 'afternoon';
    return 'night';
  }

  private extractSlotValue(payload: any, slot: ForecastSlot): string | null {
    if (!payload) return null;
    const data: any[] = Array.isArray(payload) ? payload : (payload.data ?? []);
    const entry = data[0];
    if (!entry) return null;
    return entry[slot] ?? entry[`${slot}_bm`] ?? null;
  }

  private districtFromLocationId(locationId: string): string {
    return locationId;
  }
}
