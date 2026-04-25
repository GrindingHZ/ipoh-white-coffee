export interface RecommendationIndicatorDto {
  indicator: string;
  score: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
}

export interface RecommendationAnalysisDto {
  shouldFishToday: boolean;
  profitConfidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  estimatedFuelCostRm: number | null;
  keySignals: string[];
  indicators: RecommendationIndicatorDto[];
}

export class RecommendationResponseDto {
  verdict: 'GO' | 'NO_GO' | 'ERROR';
  reason: string;
  errorDetail?: string;
  analysis: RecommendationAnalysisDto | null;
}
