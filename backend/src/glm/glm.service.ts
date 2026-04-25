import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { GlmFallbackException } from './glm-fallback.exception';

type RiskLevel = 'low' | 'medium' | 'high';

type IndicatorName =
  | 'weather'
  | 'location'
  | 'fuel'
  | 'seasonal'
  | 'landings'
  | 'tide'
  | 'timing'
  | 'safety';

export interface GlmIndicator {
  indicator: IndicatorName;
  score: number;
  confidence: number;
  riskLevel: RiskLevel;
  summary: string;
}

export interface GlmVerdict {
  verdict: 'GO' | 'NO_GO';
  shouldFishToday: boolean;
  profitConfidence: number;
  riskLevel: RiskLevel;
  reasoning: string;
  estimatedFuelCostRm: number | null;
  keySignals: string[];
  indicators: GlmIndicator[];
  reason: string;
  detail: string;
}

const TIMEOUT_MS = 10_000;
const RISK_LEVELS = ['low', 'medium', 'high'] as const;
const INDICATOR_NAMES = [
  'weather',
  'location',
  'fuel',
  'seasonal',
  'landings',
  'tide',
  'timing',
  'safety',
] as const;

const DECISION_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'glm_fishing_decision',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'verdict',
        'shouldFishToday',
        'profitConfidence',
        'riskLevel',
        'reasoning',
        'estimatedFuelCostRm',
        'keySignals',
        'indicators',
      ],
      properties: {
        verdict: { type: 'string', enum: ['GO', 'NO_GO'] },
        shouldFishToday: { type: 'boolean' },
        profitConfidence: { type: 'number', minimum: 0, maximum: 1 },
        riskLevel: { type: 'string', enum: RISK_LEVELS },
        reasoning: { type: 'string' },
        estimatedFuelCostRm: {
          type: ['number', 'null'],
          minimum: 0,
        },
        keySignals: {
          type: 'array',
          minItems: 1,
          maxItems: 6,
          items: { type: 'string' },
        },
        indicators: {
          type: 'array',
          minItems: 1,
          maxItems: 8,
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'indicator',
              'score',
              'confidence',
              'riskLevel',
              'summary',
            ],
            properties: {
              indicator: { type: 'string', enum: INDICATOR_NAMES },
              score: { type: 'number', minimum: 0, maximum: 1 },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              riskLevel: { type: 'string', enum: RISK_LEVELS },
              summary: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return (
    typeof value === 'string' &&
    (RISK_LEVELS as readonly string[]).includes(value)
  );
}

function isIndicatorName(value: unknown): value is IndicatorName {
  return (
    typeof value === 'string' &&
    (INDICATOR_NAMES as readonly string[]).includes(value)
  );
}

function isBoundedUnitNumber(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function buildDetail(indicators: GlmIndicator[]): string {
  return indicators
    .slice(0, 5)
    .map(
      (item) =>
        `${item.indicator}: ${Math.round(item.score * 100)}% (${item.riskLevel}, conf ${Math.round(item.confidence * 100)}%)`,
    )
    .join(' | ');
}

@Injectable()
export class GlmService {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.GLM_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
      timeout: TIMEOUT_MS,
    });
  }

  async complete(prompt: string): Promise<GlmVerdict> {
    let raw: string;
    try {
      const response = await this.client.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages: [
          {
            role: 'system',
            content:
              'Return only JSON matching the schema. Base all scoring on the provided context and avoid inventing unavailable data.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: DECISION_RESPONSE_FORMAT,
      });
      raw = response.choices[0]?.message?.content ?? '';
    } catch (err) {
      throw new GlmFallbackException(
        err instanceof Error ? err.message : String(err),
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new GlmFallbackException('invalid JSON response');
    }

    if (!isRecord(parsed)) {
      throw new GlmFallbackException('unexpected response shape');
    }

    const {
      verdict,
      shouldFishToday,
      profitConfidence,
      riskLevel,
      reasoning,
      estimatedFuelCostRm,
      keySignals,
      indicators,
    } = parsed;

    if (
      (verdict !== 'GO' && verdict !== 'NO_GO') ||
      typeof shouldFishToday !== 'boolean' ||
      !isBoundedUnitNumber(profitConfidence) ||
      !isRiskLevel(riskLevel) ||
      typeof reasoning !== 'string' ||
      !Array.isArray(keySignals) ||
      !Array.isArray(indicators)
    ) {
      throw new GlmFallbackException('unexpected response shape');
    }

    const normalizedSignals = keySignals
      .filter((signal): signal is string => typeof signal === 'string')
      .map((signal) => signal.trim())
      .filter((signal) => signal.length > 0);

    if (
      normalizedSignals.length === 0 ||
      normalizedSignals.length !== keySignals.length
    ) {
      throw new GlmFallbackException('unexpected response shape');
    }

    const normalizedIndicators = indicators.map((item): GlmIndicator => {
      if (!isRecord(item)) {
        throw new GlmFallbackException('unexpected response shape');
      }

      const indicator = item.indicator;
      const score = item.score;
      const confidence = item.confidence;
      const indicatorRiskLevel = item.riskLevel;
      const summary = item.summary;

      if (
        !isIndicatorName(indicator) ||
        !isBoundedUnitNumber(score) ||
        !isBoundedUnitNumber(confidence) ||
        !isRiskLevel(indicatorRiskLevel) ||
        typeof summary !== 'string' ||
        summary.trim().length === 0
      ) {
        throw new GlmFallbackException('unexpected response shape');
      }

      return {
        indicator,
        score,
        confidence,
        riskLevel: indicatorRiskLevel,
        summary: summary.trim(),
      };
    });

    let normalizedFuelCostRm: number | null = null;
    if (estimatedFuelCostRm !== undefined && estimatedFuelCostRm !== null) {
      if (
        typeof estimatedFuelCostRm !== 'number' ||
        !Number.isFinite(estimatedFuelCostRm) ||
        estimatedFuelCostRm < 0
      ) {
        throw new GlmFallbackException('unexpected response shape');
      }
      normalizedFuelCostRm = estimatedFuelCostRm;
    }

    const normalizedShouldFishToday = verdict === 'GO';

    return {
      verdict,
      shouldFishToday: normalizedShouldFishToday,
      profitConfidence,
      riskLevel,
      reasoning,
      estimatedFuelCostRm: normalizedFuelCostRm,
      keySignals: normalizedSignals,
      indicators: normalizedIndicators,
      reason: reasoning,
      detail: buildDetail(normalizedIndicators),
    };
  }
}
