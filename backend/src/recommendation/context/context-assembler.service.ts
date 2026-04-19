import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { WeatherService } from '../../weather/weather.service';
import { TideService } from '../../tide/tide.service';
import { FuelService } from '../../fuel/fuel.service';
import { PrismaService } from '../../prisma/prisma.service';
import { languageSlice } from './slices/language.slice';
import { warningSlice, forecastSlice } from './slices/weather.slice';
import { timeSlice } from './slices/time.slice';
import { tideSlice } from './slices/tide.slice';
import { fuelSlice } from './slices/fuel.slice';
import { seasonalSlice } from './slices/seasonal.slice';

const TOKEN_BUDGET = 1500;
const AVG_CHARS_PER_TOKEN = 4;

@Injectable()
export class ContextAssemblerService {
  constructor(
    private readonly weather: WeatherService,
    private readonly tide: TideService,
    private readonly fuel: FuelService,
    private readonly prisma: PrismaService,
  ) {}

  async assemble(
    profile: User,
    locationId: string,
    district: string,
    serverTime: Date,
  ): Promise<string> {
    const language = (profile.language ?? 'ms') as 'ms' | 'en';
    const departureHour = profile.typicalDepartureTime
      ? parseInt(profile.typicalDepartureTime.split(':')[0], 10)
      : serverTime.getHours();

    const [warnings, forecast, tideInfo, fuelInfo] = await Promise.all([
      this.weather.getActiveWarnings(district).catch(() => []),
      this.weather
        .getForecastForTripWindow(locationId, serverTime, departureHour)
        .catch(() => null),
      this.tide.getTideForDay(district, serverTime),
      this.fuel.getLatestPrice(),
    ]);

    const slices: string[] = [
      languageSlice(language),
      warningSlice(warnings),
      forecastSlice(forecast, district),
      timeSlice(serverTime, profile.typicalDepartureTime),
      tideSlice(tideInfo, serverTime),
      fuelSlice(fuelInfo, profile.fuelCapacity ? Number(profile.fuelCapacity) : null),
      await seasonalSlice(this.prisma, district, profile.targetSpecies, serverTime.getMonth() + 1),
    ];

    return this.applyTokenBudget(slices);
  }

  private applyTokenBudget(slices: string[]): string {
    const mustKeep = slices.slice(0, 2);
    const optional = slices.slice(2);

    let prompt = mustKeep.filter(Boolean).join('\n\n');
    for (const slice of optional) {
      if (!slice) continue;
      const candidate = `${prompt}\n\n${slice}`;
      if (candidate.length / AVG_CHARS_PER_TOKEN > TOKEN_BUDGET) break;
      prompt = candidate;
    }

    return prompt.trim();
  }

}
