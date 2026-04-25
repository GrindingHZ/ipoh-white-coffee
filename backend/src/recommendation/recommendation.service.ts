import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { SafetyService } from './safety/safety.service';
import { ContextAssemblerService } from './context/context-assembler.service';
import { GlmService } from '../glm/glm.service';
import { GlmFallbackException } from '../glm/glm-fallback.exception';
import { TapRequestDto } from './dto/tap-request.dto';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';
import locationMap from '../data/location-map.json';

const ERROR_REASON_MS =
  'Tidak dapat membuat penilaian sekarang. Cuba sebentar lagi.';
const ERROR_REASON_EN =
  'Unable to make an assessment right now. Please try again.';

@Injectable()
export class RecommendationService {
  constructor(
    private readonly users: UserService,
    private readonly safety: SafetyService,
    private readonly contextAssembler: ContextAssemblerService,
    private readonly glm: GlmService,
  ) {}

  async recommend(
    userId: string,
    dto: TapRequestDto,
  ): Promise<RecommendationResponseDto> {
    const profile = await this.users.getProfile(userId);
    const language = (profile.language ?? 'ms') as 'ms' | 'en';

    const district = this.resolveDistrict(dto, profile.locality);
    const locationId =
      (locationMap as Record<string, string>)[district] ?? district;
    const serverTime = new Date();
    const departureHour = profile.typicalDepartureTime
      ? parseInt(profile.typicalDepartureTime.split(':')[0], 10)
      : serverTime.getHours();

    const safetyResult = await this.safety.check(
      district,
      locationId,
      serverTime,
      departureHour,
      language,
    );
    if (safetyResult) return safetyResult;

    const prompt = await this.contextAssembler.assemble(
      profile,
      locationId,
      district,
      serverTime,
    );

    try {
      const result = await this.glm.complete(prompt);
      return {
        verdict: result.verdict,
        reason: result.reason,
        detail: result.detail,
      };
    } catch (err) {
      if (err instanceof GlmFallbackException) {
        return {
          verdict: 'ERROR',
          reason: language === 'ms' ? ERROR_REASON_MS : ERROR_REASON_EN,
          detail: err.message,
        };
      }
      throw err;
    }
  }

  private resolveDistrict(dto: TapRequestDto, locality: string): string {
    if (dto.lat !== undefined && dto.lng !== undefined) {
      return this.nearestCoastalDistrict(dto.lat, dto.lng);
    }
    return locality;
  }

  private nearestCoastalDistrict(_lat: number, _lng: number): string {
    // Placeholder: full geo-resolution is a future concern
    return Object.keys(locationMap)[0];
  }
}
