import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthGuard } from './auth.guard';
import { RecommendationController } from './recommendation.controller';

describe('RecommendationController', () => {
  it('protects recommendation requests with the session auth guard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      RecommendationController.prototype.recommend,
    );

    expect(guards).toContain(AuthGuard);
  });
});
