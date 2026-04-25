import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { SafetyService } from './safety/safety.service';
import { ContextAssemblerService } from './context/context-assembler.service';
import { FishingSignalService } from './fishing-signal.service';
import { WeatherModule } from '../weather/weather.module';
import { TideModule } from '../tide/tide.module';
import { FuelModule } from '../fuel/fuel.module';
import { UserModule } from '../user/user.module';
import { GlmModule } from '../glm/glm.module';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [WeatherModule, TideModule, FuelModule, UserModule, GlmModule, AuthModule],
  controllers: [RecommendationController],
  providers: [
    AuthGuard,
    RecommendationService,
    SafetyService,
    ContextAssemblerService,
    FishingSignalService,
  ],
})
export class RecommendationModule {}
