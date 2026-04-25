import { Controller, Get, ParseFloatPipe, Query } from '@nestjs/common';
import { WeatherService, Warning, ForecastSlotResult } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get('warnings')
  async warnings(
    @Query('state') state?: string,
    @Query('lat', new ParseFloatPipe({ optional: true })) lat?: number,
    @Query('lng', new ParseFloatPipe({ optional: true })) lng?: number,
  ): Promise<Warning[]> {
    const resolvedState =
      state ?? (lat != null && lng != null ? await this.weather.reverseGeocodeState(lat, lng) : null);
    return this.weather.getActiveWarnings(resolvedState ?? '');
  }

  @Get('forecast')
  forecast(
    @Query('district') district: string,
    @Query('date') date: string,
    @Query('departureHour') departureHour: string,
  ): Promise<ForecastSlotResult | null> {
    return this.weather.getForecastForTripWindow(
      district,
      new Date(date),
      parseInt(departureHour, 10),
    );
  }
}
