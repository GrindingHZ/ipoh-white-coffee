export class GlmFallbackException extends Error {
  constructor(cause?: string) {
    super(`GLM unavailable: ${cause ?? 'unknown'}`);
    this.name = 'GlmFallbackException';
  }
}
