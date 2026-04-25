import { GlmFallbackException } from '../glm/glm-fallback.exception';
import { RecommendationService } from './recommendation.service';

describe('RecommendationService', () => {
  it('returns GLM fallback details for debugging when completion fails', async () => {
    const users = {
      getProfile: jest.fn().mockResolvedValue({
        id: 'user-1',
        locality: 'Perak',
        language: 'en',
        typicalDepartureTime: '06:00',
      }),
    };
    const safety = {
      check: jest.fn().mockResolvedValue(null),
    };
    const contextAssembler = {
      assemble: jest.fn().mockResolvedValue('recommendation prompt'),
    };
    const glm = {
      complete: jest
        .fn()
        .mockRejectedValue(new GlmFallbackException('invalid JSON response')),
    };
    const service = new RecommendationService(
      users as any,
      safety as any,
      contextAssembler as any,
      glm as any,
    );

    await expect(service.recommend('user-1', {})).resolves.toEqual({
      verdict: 'ERROR',
      reason: 'Unable to make an assessment right now. Please try again.',
      detail: 'GLM unavailable: invalid JSON response',
      analysis: null,
    });
  });
});
