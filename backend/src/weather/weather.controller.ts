import { Controller, Get, ParseFloatPipe, Query } from '@nestjs/common';
import { WeatherService, Warning, ForecastSlotResult } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weather: WeatherService) {}

  @Get('warnings')
  warnings(@Query('state') state: string): Promise<Warning[]> {
    return this.weather.getActiveWarnings(state);
  }

  @Get('state')
  async stateFromCoords(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
  ): Promise<{ state: string | null }> {
    const state = await this.weather.reverseGeocodeState(lat, lng);
    return { state };
  }

  @Get('forecast')
  forecast(
    @Query('locationId') locationId: string,
    @Query('date') date: string,
    @Query('departureHour') departureHour: string,
  ): Promise<ForecastSlotResult | null> {
    return this.weather.getForecastForTripWindow(
      locationId,
      new Date(date),
      parseInt(departureHour, 10),
    );
  }
}
