export const SESSION_COOKIE_NAME = 'fisheriq_session';
export const SESSION_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
export const SESSION_COOKIE_MAX_AGE_MS = SESSION_COOKIE_MAX_AGE_SECONDS * 1000;

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
    secure: process.env.NODE_ENV === 'production',
  };
}
