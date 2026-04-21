import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { GlmFallbackException } from './glm-fallback.exception';

export interface GlmVerdict {
  verdict: 'GO' | 'NO_GO';
  reason: string;
  detail: string;
}

const TIMEOUT_MS = 10_000;

@Injectable()
export class GlmService {
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.GLM_API_KEY,
      baseURL: 'https://api.z.ai/api/paas/v4/',
      timeout: TIMEOUT_MS,
    });
  }

  async complete(prompt: string): Promise<GlmVerdict> {
    let raw: string;
    try {
      const response = await this.client.chat.completions.create({
        model: 'glm-5.1',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        // @ts-expect-error GLM-specific extension
        thinking: { type: 'enabled' },
      });
      raw = response.choices[0]?.message?.content ?? '';
    } catch (err) {
      throw new GlmFallbackException(err?.message);
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
