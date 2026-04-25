import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { WeatherService } from '../../weather/weather.service';
import { TideService } from '../../tide/tide.service';
import { FuelService } from '../../fuel/fuel.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FishingSignalService } from '../fishing-signal.service';
import { GlmService, GlmSliceAnalysis, SliceId } from '../../glm/glm.service';
import { languageSlice } from './slices/language.slice';
import { warningSlice, forecastSlice } from './slices/weather.slice';
import { timeSlice } from './slices/time.slice';
import { tideSlice } from './slices/tide.slice';
import { fuelSlice } from './slices/fuel.slice';
import { seasonalSlice } from './slices/seasonal.slice';
import { landingsSlice } from './slices/landings.slice';

const TOKEN_BUDGET = 1500;
const AVG_CHARS_PER_TOKEN = 4;
const SLICE_RETRY_COUNT = 1;

type SliceEvidence = {
  slice: SliceId;
  raw: string;
};

@Injectable()
export class ContextAssemblerService {
  constructor(
    private readonly weather: WeatherService,
    private readonly tide: TideService,
    private readonly fuel: FuelService,
    private readonly signals: FishingSignalService,
    private readonly prisma: PrismaService,
    private readonly glm: GlmService,
  ) {}

  async assemble(
    profile: User,
    district: string,
    serverTime: Date,
  ): Promise<string> {
    const language = (profile.language ?? 'en') as 'ms' | 'en';
    const departureHour = profile.typicalDepartureTime
      ? parseInt(profile.typicalDepartureTime.split(':')[0], 10)
      : serverTime.getHours();

    const [warnings, forecast, tideInfo, fuelInfo, previousWeekDieselPrice] =
      await Promise.all([
        this.weather.getActiveWarnings(district).catch(() => []),
        this.weather
          .getForecastForTripWindow(district, serverTime, departureHour)
          .catch(() => null),
        this.tide.getTideForDay(district, serverTime),
        this.fuel.getLatestPriceForLocality(district).catch(() => null),
        this.fuel.getPreviousWeekDieselPrice(district).catch(() => null),
      ]);

    const signals = this.signals.score(
      district,
      warnings,
      serverTime.getMonth() + 1,
    );

    const [seasonalInfo, landingsInfo] = await Promise.all([
      seasonalSlice(
        this.prisma,
        district,
        profile.targetSpecies,
        serverTime.getMonth() + 1,
        signals,
      ),
      landingsSlice(this.prisma, district, serverTime.getMonth() + 1, signals),
    ]);

    const weatherEvidence = [
      warningSlice(warnings, signals),
      forecastSlice(forecast, district),
    ]
      .filter((slice) => slice.trim().length > 0)
      .join('\n');

    const evidenceSlices: SliceEvidence[] = [
      { slice: 'weather', raw: weatherEvidence },
      {
        slice: 'timing',
        raw: timeSlice(serverTime, profile.typicalDepartureTime),
      },
      { slice: 'tide', raw: tideSlice(tideInfo, serverTime) },
      {
        slice: 'fuel',
        raw: fuelSlice(
          fuelInfo,
          profile.fuelCapacity ? Number(profile.fuelCapacity) : null,
          previousWeekDieselPrice,
        ),
      },
      { slice: 'seasonal', raw: seasonalInfo },
      { slice: 'landings', raw: landingsInfo },
    ];

    const structuredAnalyses = await Promise.all(
      evidenceSlices
        .filter((slice) => slice.raw.trim().length > 0)
        .map((slice) => this.completeSliceWithRetry(slice)),
    );

    const sections: string[] = [
      languageSlice(language),
      'Base tradeoffs only on the structured slice analyses below. Preserve the language instruction above and do not infer from omitted raw evidence.',
      'Structured slice analyses (compact JSON):',
      ...(structuredAnalyses.length
        ? structuredAnalyses.map((slice) => this.renderStructuredSlice(slice))
        : [
            '{"slice":"none","summary":"No structured slice evidence available.","dataGaps":["insufficient evidence"],"metrics":{}}',
          ]),
    ];

    return this.applyTokenBudget(sections, 3);
  }

  private async completeSliceWithRetry(
    slice: SliceEvidence,
  ): Promise<GlmSliceAnalysis> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= SLICE_RETRY_COUNT; attempt += 1) {
      try {
        return await this.glm.completeSlice(slice.slice, slice.raw);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError;
  }

  private renderStructuredSlice(slice: GlmSliceAnalysis): string {
    return JSON.stringify({
      slice: slice.slice,
      score: Number(slice.score.toFixed(2)),
      confidence: Number(slice.confidence.toFixed(2)),
      riskLevel: slice.riskLevel,
      summary: slice.summary,
      supportingFacts: slice.supportingFacts,
      metrics: slice.metrics,
      dataGaps: slice.dataGaps,
    });
  }

  private applyTokenBudget(sections: string[], mustKeepCount = 2): string {
    const keepCount = Math.min(Math.max(mustKeepCount, 0), sections.length);
    const mustKeep = sections.slice(0, keepCount);
    const optional = sections.slice(keepCount);

    let prompt = mustKeep
      .filter((section) => section.trim().length > 0)
      .join('\n\n');
    for (const section of optional) {
      if (!section || section.trim().length === 0) continue;
      const candidate = prompt ? `${prompt}\n\n${section}` : section;
      if (candidate.length / AVG_CHARS_PER_TOKEN > TOKEN_BUDGET) break;
      prompt = candidate;
    }

    return prompt.trim();
  }
}
