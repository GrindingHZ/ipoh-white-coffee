import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { WeatherModule } from './weather/weather.module';
import { TideModule } from './tide/tide.module';
import { FuelModule } from './fuel/fuel.module';
import { UserModule } from './user/user.module';
import { GlmModule } from './glm/glm.module';
import { SeedModule } from './seed/seed.module';
import { RecommendationModule } from './recommendation/recommendation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    WeatherModule,
    TideModule,
    FuelModule,
    UserModule,
    GlmModule,
    SeedModule,
    RecommendationModule,
  ],
})
export class AppModule {}
