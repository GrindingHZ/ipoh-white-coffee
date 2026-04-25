export function languageSlice(language: 'ms' | 'en'): string {
  return language === 'ms'
    ? 'Respond in Bahasa Malaysia.'
    : 'Respond in English.';
}
