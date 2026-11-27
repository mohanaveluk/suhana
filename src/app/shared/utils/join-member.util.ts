/**
 * "Create my matrimony profile" for an existing Aurora account that has no
 * MEMBER role yet (registered on Aurora for Providers). The login page stores
 * the email here — this tab only, never in the URL — and the register page
 * pre-fills it; the person still re-enters their password to prove ownership.
 */
const JOIN_EMAIL_KEY = 'aurora_join_member_email';

export function rememberJoinEmail(email: string): void {
  try { sessionStorage.setItem(JOIN_EMAIL_KEY, email.trim().toLowerCase()); } catch { /* storage unavailable */ }
}

export function takeJoinEmail(): string | null {
  try {
    const v = sessionStorage.getItem(JOIN_EMAIL_KEY);
    sessionStorage.removeItem(JOIN_EMAIL_KEY);
    return v;
  } catch {
    return null;
  }
}
