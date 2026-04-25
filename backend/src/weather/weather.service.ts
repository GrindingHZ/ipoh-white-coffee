import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import locationMap from '../data/location-map.json';
import {
  THUNDERSTORM_EN,
  THUNDERSTORM_BM,
  THUNDERSTORM_FORECAST_PREFIX,
  ForecastSlot,
  SLOT_HOUR_RANGES,
} from '../data/forecast-values';

type LocationMapValue = string | string[];

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
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Warning fetch failed: ${message}`);
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
        title_en: w.warning_issue?.title_en ?? '',
        title_bm: w.warning_issue?.title_bm ?? '',
        text_en: w.text_en ?? '',
        text_bm: w.text_bm ?? '',
        valid_from: w.valid_from,
        valid_to: w.valid_to,
        isThunderstorm:
          (w.warning_issue?.title_en ?? '').includes(THUNDERSTORM_EN) ||
          (w.warning_issue?.title_bm ?? '').includes(THUNDERSTORM_BM),
        waveHeightMetres: this.parseWaveHeight(w.text_en ?? ''),
      }));
  }

  async getForecastForTripWindow(
    district: string,
    date: Date,
    departureHour: number,
  ): Promise<ForecastSlotResult | null> {
    const locationIds = this.locationIdsFromDistrict(district);
    const cacheEntry = await this.getCacheEntry('forecast', district);
    let payload: any;

    if (cacheEntry && this.isFresh(cacheEntry.fetchedAt, FORECAST_TTL_MS)) {
      payload = cacheEntry.payload;
    } else {
      try {
        payload = await this.fetchForecastForLocationIds(locationIds, date);
        await this.upsertCache('forecast', district, payload);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Forecast fetch failed: ${message}`);
        if (cacheEntry) {
          payload = cacheEntry.payload;
        } else {
          throw new Error('NO_CACHE');
        }
      }
    }

    const slot = this.hourToSlot(departureHour);
    const values = this.extractSlotValues(payload, slot);
    if (values.length === 0) return null;
    const hasThunderstorm = values.some((value) =>
      value.startsWith(THUNDERSTORM_FORECAST_PREFIX),
    );
    const value =
      values.find((forecastValue) =>
        forecastValue.startsWith(THUNDERSTORM_FORECAST_PREFIX),
      ) ?? values[0];

    return {
      slot,
      value,
      isThunderstorm: hasThunderstorm,
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

  private async fetchForecastForLocationIds(
    locationIds: string[],
    date: Date,
  ): Promise<any[]> {
    const responses = await Promise.allSettled(
      locationIds.map((locationId) => this.fetchForecast(locationId, date)),
    );

    const merged: any[] = [];
    for (const response of responses) {
      if (response.status !== 'fulfilled') {
        continue;
      }

      const data = Array.isArray(response.value)
        ? response.value
        : (response.value?.data ?? []);
      if (Array.isArray(data)) {
        merged.push(...data);
      }
    }

    if (merged.length === 0) {
      throw new Error('NO_FORECAST_DATA');
    }

    return merged;
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

  private extractSlotValues(payload: any, slot: ForecastSlot): string[] {
    if (!payload) return [];
    const data: any[] = Array.isArray(payload) ? payload : (payload.data ?? []);
    if (data.length === 0) return [];

    const slotCandidates = [
      slot,
      `${slot}_forecast`,
      `${slot}_bm`,
      `${slot}_forecast_bm`,
    ];

    const values: string[] = [];
    for (const entry of data) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }

      for (const key of slotCandidates) {
        const value = entry[key];
        if (typeof value === 'string' && value.trim().length > 0) {
          values.push(value);
          break;
        }
      }
    }

    return values;
  }

  async reverseGeocodeState(lat: number, lng: number): Promise<string | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'UMIpohWhiteCoffee/1.0' },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return (json?.address?.state as string) ?? null;
    } catch {
      return null;
    }
  }

  private locationIdsFromDistrict(district: string): string[] {
    const map = locationMap as Record<string, LocationMapValue>;
    const directIds = this.toLocationIds(map[district]);
    if (directIds.length > 0) {
      return directIds;
    }

    const normalized = this.normalizeDistrict(district);
    if (!normalized) return [district];

    const entries = Object.entries(map).map(
      ([name, value]) =>
        [this.normalizeDistrict(name), this.toLocationIds(value)] as [
          string,
          string[],
        ],
    );

    const exact = entries.find(([n]) => n === normalized);
    if (exact) return exact[1];

    const firstSegment = district.split(',')[0]?.trim();
    if (firstSegment) {
      const firstSegmentIds = this.toLocationIds(map[firstSegment]);
      if (firstSegmentIds.length > 0) {
        return firstSegmentIds;
      }
    }

    const normSegment = this.normalizeDistrict(firstSegment);
    if (normSegment) {
      const segmentMatch = entries.find(([n]) => n === normSegment);
      if (segmentMatch) return segmentMatch[1];
    }

    const fuzzy = entries.find(
      ([n]) => normalized.includes(n) || n.includes(normalized),
    );
    return fuzzy?.[1] ?? [district];
  }

  private toLocationIds(value: LocationMapValue | undefined): string[] {
    if (!value) {
      return [];
    }

    const ids = Array.isArray(value) ? value : [value];
    return [
      ...new Set(
        ids.filter((id) => typeof id === 'string' && id.trim().length > 0),
      ),
    ];
  }

  private normalizeDistrict(value: string | undefined): string {
    if (!value) return '';
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
