import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { GlmFallbackException } from './glm-fallback.exception';

export interface GlmVerdict {
  verdict: 'GO' | 'NO_GO';
  reason: string;
  detail: string;
}

const TIMEOUT_MS = 10_000;

const VERDICT_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'glm_verdict',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['verdict', 'reason', 'detail'],
      properties: {
        verdict: { type: 'string', enum: ['GO', 'NO_GO'] },
        reason: { type: 'string' },
        detail: { type: 'string' },
      },
    },
  },
} as const;

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
          { role: 'system', content: 'Return only a valid json object.' },
          { role: 'user', content: prompt },
        ],
        response_format: VERDICT_RESPONSE_FORMAT,
      });
      raw = response.choices[0]?.message?.content ?? '';
    } catch (err) {
      throw new GlmFallbackException(
        err instanceof Error ? err.message : String(err),
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new GlmFallbackException('invalid JSON response');
    }

    if (
      (parsed.verdict !== 'GO' && parsed.verdict !== 'NO_GO') ||
      typeof parsed.reason !== 'string' ||
      typeof parsed.detail !== 'string'
    ) {
      throw new GlmFallbackException('unexpected response shape');
    }

    return parsed as GlmVerdict;
  }
}
