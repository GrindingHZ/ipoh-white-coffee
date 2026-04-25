import { Injectable } from '@nestjs/common';
import {
  WeatherService,
  Warning,
  ForecastSlotResult,
} from '../../weather/weather.service';
import { RecommendationResponseDto } from '../dto/recommendation-response.dto';

const WAVE_HEIGHT_LIMIT = 2.5;

@Injectable()
export class SafetyService {
  constructor(private readonly weather: WeatherService) {}

  async check(
    state: string,
    locationId: string,
    date: Date,
    departureHour: number,
    language: 'ms' | 'en',
  ): Promise<RecommendationResponseDto | null> {
    let warnings: Warning[];
    let forecast: ForecastSlotResult | null;

    try {
      warnings = await this.weather.getActiveWarnings(state);
      forecast = await this.weather.getForecastForTripWindow(
        locationId,
        date,
        departureHour,
      );
    } catch (err) {
      if (err.message === 'NO_CACHE') {
        return {
          verdict: 'NO_GO',
          reason:
            language === 'ms'
              ? 'Tidak dapat menilai keadaan cuaca sekarang.'
              : 'Unable to assess weather conditions right now.',
          detail: null,
        };
      }
      throw err;
    }

    for (const w of warnings) {
      if (w.isThunderstorm) {
        return this.noGo(language, w.title_en);
      }
      if (
        w.waveHeightMetres !== null &&
        w.waveHeightMetres >= WAVE_HEIGHT_LIMIT
      ) {
        return this.noGo(language, w.title_en);
      }
    }

    if (forecast?.isThunderstorm) {
      return this.noGo(language, 'Thunderstorm forecast during trip window');
    }

    return null;
  }

  private noGo(
    language: 'ms' | 'en',
    reason: string,
  ): RecommendationResponseDto {
    return {
      verdict: 'NO_GO',
      reason:
        language === 'ms'
          ? `Tidak selamat untuk ke laut: ${reason}`
          : `Not safe to go out: ${reason}`,
      detail: null,
    };
  }
}
