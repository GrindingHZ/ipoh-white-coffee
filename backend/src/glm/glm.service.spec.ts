import { GlmFallbackException } from './glm-fallback.exception';
import { GlmService } from './glm.service';

const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

describe('GlmService.completeSlice', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('normalizes valid structured slice responses', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              slice: 'weather',
              score: 0.72,
              confidence: 0.81,
              riskLevel: 'medium',
              summary: '  weather is manageable with caution  ',
              supportingFacts: [' moderate swell ', 'no thunderstorm warning'],
              metrics: [
                { key: 'maxWaveHeightMetres', value: 1.8 },
                { key: 'cautionFlag', value: true },
                { key: 'note', value: '  morning window stable ' },
              ],
              dataGaps: ['  no live wind buoy in district  '],
            }),
          },
        },
      ],
    });

    const service = new GlmService();

    await expect(service.completeSlice('weather', 'evidence')).resolves.toEqual(
      {
        slice: 'weather',
        score: 0.72,
        confidence: 0.81,
        riskLevel: 'medium',
        summary: 'weather is manageable with caution',
        supportingFacts: ['moderate swell', 'no thunderstorm warning'],
        metrics: {
          maxWaveHeightMetres: 1.8,
          cautionFlag: true,
          note: 'morning window stable',
        },
        dataGaps: ['no live wind buoy in district'],
      },
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        response_format: expect.objectContaining({
          type: 'json_schema',
        }),
      }),
    );

    const firstCall = mockCreate.mock.calls[0]?.[0] as {
      messages?: Array<{ content?: string }>;
    };
    expect(firstCall.messages?.[1]?.content).toContain('Slice: weather');
  });

  it('throws fallback when slice response is invalid JSON', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'not json' } }],
    });

    const service = new GlmService();

    await expect(service.completeSlice('weather', 'evidence')).rejects.toThrow(
      GlmFallbackException,
    );
    await expect(service.completeSlice('weather', 'evidence')).rejects.toThrow(
      'GLM unavailable: invalid JSON response',
    );
  });

  it('truncates overly long summary to keep compact output', async () => {
    const longSummary = 'x'.repeat(350);
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              slice: 'weather',
              score: 0.72,
              confidence: 0.81,
              riskLevel: 'medium',
              summary: longSummary,
              supportingFacts: ['moderate swell'],
              metrics: [{ key: 'maxWaveHeightMetres', value: 1.8 }],
              dataGaps: ['no live wind buoy in district'],
            }),
          },
        },
      ],
    });

    const service = new GlmService();
    const result = await service.completeSlice('weather', 'evidence');

    expect(result.summary.length).toBeLessThanOrEqual(280);
    expect(result.summary.endsWith('...')).toBe(true);
  });

  it('throws fallback when slice response shape is invalid', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              slice: 'weather',
              score: 0.72,
              confidence: 0.81,
              riskLevel: 'medium',
              summary: 'weather is manageable with caution',
              supportingFacts: ['moderate swell'],
              metrics: { maxWaveHeightMetres: 1.8 },
            }),
          },
        },
      ],
    });

    const service = new GlmService();

    await expect(service.completeSlice('weather', 'evidence')).rejects.toThrow(
      GlmFallbackException,
    );
    await expect(service.completeSlice('weather', 'evidence')).rejects.toThrow(
      'GLM unavailable: unexpected response shape',
    );
  });
});
