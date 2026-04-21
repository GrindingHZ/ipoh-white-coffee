export class RecommendationResponseDto {
  verdict: 'GO' | 'NO_GO' | 'ERROR';
  reason: string;
  detail: string | null;
}
