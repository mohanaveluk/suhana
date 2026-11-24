/** Mirrors suhana-api `src/shared/sms/admin-sms-settings.controller.ts` (SmsSettingsDto). */
export interface SmsSettings {
  /** Admin switch — false means no text messages are sent site-wide. */
  sendingEnabled: boolean;
  /** A provider is configured on the server (TELNYX_ENABLED + credentials, or dev log-only). */
  providerConfigured: boolean;
  /** 'telnyx' | 'log' (development log-only) | null. */
  provider: 'telnyx' | 'log' | string | null;
  /** Texts actually go out right now (switch on AND a real provider configured). */
  effective: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}
