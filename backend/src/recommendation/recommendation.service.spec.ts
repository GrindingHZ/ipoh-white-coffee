import { GlmFallbackException } from '../glm/glm-fallback.exception';
import { RecommendationService } from './recommendation.service';

describe('RecommendationService', () => {
  it('returns GLM fallback error detail when completion fails', async () => {
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
      errorDetail: 'GLM unavailable: invalid JSON response',
      analysis: null,
    });
  });

  it('returns GLM fallback error detail when context assembly fails', async () => {
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
      assemble: jest
        .fn()
        .mockRejectedValue(new GlmFallbackException('slice weather failed')),
    };
    const glm = {
      complete: jest.fn(),
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
      errorDetail: 'GLM unavailable: slice weather failed',
      analysis: null,
    });
    expect(glm.complete).not.toHaveBeenCalled();
  });

  it('returns localized ERROR when slice analysis fails during context assembly', async () => {
    const users = {
      getProfile: jest.fn().mockResolvedValue({
        id: 'user-1',
        locality: 'Perak',
        language: 'ms',
        typicalDepartureTime: '06:00',
      }),
    };
    const safety = {
      check: jest.fn().mockResolvedValue(null),
    };
    const contextAssembler = {
      assemble: jest
        .fn()
        .mockRejectedValue(new GlmFallbackException('slice weather failed')),
    };
    const glm = {
      complete: jest.fn(),
    };
    const service = new RecommendationService(
      users as any,
      safety as any,
      contextAssembler as any,
      glm as any,
    );

    await expect(service.recommend('user-1', {})).resolves.toEqual({
      verdict: 'ERROR',
      reason: 'Tidak dapat membuat penilaian sekarang. Cuba sebentar lagi.',
      errorDetail: 'GLM unavailable: slice weather failed',
      analysis: null,
    });
    expect(glm.complete).not.toHaveBeenCalled();
  });

  it('forwards comma-separated locality text to safety checks', async () => {
    const users = {
      getProfile: jest.fn().mockResolvedValue({
        id: 'user-1',
        locality: 'Johor Bahru, Johor',
        language: 'en',
        typicalDepartureTime: '06:00',
      }),
    };
    const safetyResult = {
      verdict: 'NO_GO',
      reason: 'Unsafe conditions',
      analysis: null,
    };
    const safety = {
      check: jest.fn().mockResolvedValue(safetyResult),
    };
    const contextAssembler = {
      assemble: jest.fn(),
    };
    const glm = {
      complete: jest.fn(),
    };
    const service = new RecommendationService(
      users as any,
      safety as any,
      contextAssembler as any,
      glm as any,
    );

    await expect(service.recommend('user-1', {})).resolves.toEqual(
      safetyResult,
    );
    expect(safety.check).toHaveBeenCalledWith(
      'Johor Bahru, Johor',
      expect.any(Date),
      6,
      'en',
    );
  });

  it('forwards legacy locality aliases to safety checks', async () => {
    const users = {
      getProfile: jest.fn().mockResolvedValue({
        id: 'user-1',
        locality: 'Cameron Highlands',
        language: 'en',
        typicalDepartureTime: '06:00',
      }),
    };
    const safetyResult = {
      verdict: 'NO_GO',
      reason: 'Unsafe conditions',
      analysis: null,
    };
    const safety = {
      check: jest.fn().mockResolvedValue(safetyResult),
    };
    const contextAssembler = {
      assemble: jest.fn(),
    };
    const glm = {
      complete: jest.fn(),
    };
    const service = new RecommendationService(
      users as any,
      safety as any,
      contextAssembler as any,
      glm as any,
    );

    await expect(service.recommend('user-1', {})).resolves.toEqual(
      safetyResult,
    );
    expect(safety.check).toHaveBeenCalledWith(
      'Cameron Highlands',
      expect.any(Date),
      6,
      'en',
    );
  });
});
