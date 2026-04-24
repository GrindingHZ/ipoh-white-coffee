import { Controller, Get, Query } from '@nestjs/common';
import { FuelPriceResponse, FuelService } from './fuel.service';

@Controller('fuel')
export class FuelController {
  constructor(private readonly fuel: FuelService) {}

  @Get('latest')
  latest(@Query('locality') locality?: string): Promise<FuelPriceResponse> {
    return this.fuel.getLatestPriceForLocality(locality);
  }
}
