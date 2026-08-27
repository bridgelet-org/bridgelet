/**
 * i18n/index.ts
 *
 * Issue #484: Mobile app localization
 *
 * Sets up i18next with:
 *  - Device locale detection via expo-localization
 *  - AsyncStorage persistence for manual language override
 *  - English (en), Spanish (es), and French (fr) locale bundles
 *  - Interpolation for dynamic values ({{amount}}, {{asset}}, etc.)
 *
 * Usage:
 *   import { t } from '@/i18n';
 *   t('claim.title')
 *   t('claim.successMessage', { amount: '10', asset: 'USDC' })
 *
 * Changing language at runtime:
 *   import { changeLanguage } from '@/i18n';
 *   await changeLanguage('es');
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

// ─── Constants ────────────────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

const LANGUAGE_STORAGE_KEY = '@bridgelet:language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// ─── Locale resolution ────────────────────────────────────────────────────────

/**
 * Detect the device locale and return the closest supported language.
 * Falls back to DEFAULT_LANGUAGE when no match is found.
 */
function detectDeviceLanguage(): SupportedLanguage {
  const locales = Localization.getLocales();
  for (const locale of locales) {
    const lang = locale.languageCode?.toLowerCase() as SupportedLanguage | undefined;
    if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
      return lang;
    }
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Load the persisted language preference from AsyncStorage.
 * Returns null when no preference has been saved.
 */
async function loadPersistedLanguage(): Promise<SupportedLanguage | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
      return stored as SupportedLanguage;
    }
  } catch {
    // Storage unavailable — proceed with device detection
  }
  return null;
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Initialise i18next.  Call this once at app startup (e.g. in _layout.tsx)
 * and await the returned promise before rendering any translated strings.
 */
export async function initI18n(): Promise<void> {
  const persisted = await loadPersistedLanguage();
  const deviceLang = detectDeviceLanguage();
  const lng = persisted ?? deviceLang;

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es },
        fr: { translation: fr },
      },
      lng,
      fallbackLng: DEFAULT_LANGUAGE,
      interpolation: {
        escapeValue: false, // React Native handles XSS
      },
      compatibilityJSON: 'v4',
    });
}

/**
 * Change the active language and persist the choice so it survives restarts.
 */
export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Non-fatal — preference simply won't persist across restarts
  }
}

/**
 * Return the currently active language code.
 */
export function getCurrentLanguage(): SupportedLanguage {
  const lang = i18n.language as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
}

// Re-export the i18next translate function for convenience
export const t = i18n.t.bind(i18n);
export default i18n;
