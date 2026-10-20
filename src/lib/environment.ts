/**
 * Environment & Campus Isolation Helper
 * SIMKA.ID Pro V1
 *
 * Ensures absolute isolation between PUTRA and PUTRI environments.
 * Prevents cross-campus data leaks, cross-notifications, and unverified data display.
 */

export type LingkunganPesantren = 'PUTRA' | 'PUTRI';

/**
 * Gets the authoritative active environment for this app deployment.
 * Priority:
 * 1. Explicit environment variable (VITE_APP_ENVIRONMENT / VITE_CAMPUS / VITE_PESANTREN_TYPE)
 * 2. Local storage override (if explicitly configured by admin in database settings)
 * 3. Default to 'PUTRI' derived from project title in metadata.json
 */
export function getActiveEnvironment(): LingkunganPesantren {
  const env = (import.meta as any).env || {};
  const envVar = (
    env.VITE_APP_ENVIRONMENT ||
    env.VITE_CAMPUS ||
    env.VITE_PESANTREN_TYPE ||
    ''
  ).trim().toUpperCase();

  if (envVar.includes('PUTRA')) return 'PUTRA';
  if (envVar.includes('PUTRI')) return 'PUTRI';

  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('SIMKA_APP_ENVIRONMENT');
    if (saved) {
      const upper = saved.trim().toUpperCase();
      if (upper === 'PUTRA' || upper === 'PUTRI') return upper;
    }
  }

  // Authoritative default based on metadata.json ("Remix SIMKA.ID PUTRI")
  return 'PUTRI';
}

/**
 * Validates whether a data record matches the active environment.
 * If the record has an explicit lingkungan attribute that doesn't match, it is rejected.
 */
export function isRecordInActiveEnvironment(recordLingkungan?: string | null): boolean {
  if (!recordLingkungan) {
    // If table doesn't have lingkungan column yet (single database per environment model), accept
    return true;
  }
  const clean = String(recordLingkungan).trim().toUpperCase();
  return clean === getActiveEnvironment();
}
