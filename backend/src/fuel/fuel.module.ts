import { Module } from '@nestjs/common';
import { FuelService } from './fuel.service';

@Module({
  providers: [FuelService],
  exports: [FuelService],
})
export class FuelModule {}
