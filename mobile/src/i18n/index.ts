// The app's strings in English and Italian, following the device language. Anything that isn't
// Italian gets English. Pure TypeScript, so the test scripts run it in Node.
import { en, type StringKey } from './en';
import { it } from './it';

export type Locale = 'en' | 'it';
export type { StringKey };

const TABLES: Record<Locale, Record<StringKey, string>> = { en, it };
const DATE_LOCALE: Record<Locale, string> = { en: 'en-GB', it: 'it-IT' };

// The first tag in a language we have decides: ['de-DE', 'it-CH'] is Italian, ['en-US', 'it-IT'] English.
export function pickLocale(tags: readonly string[]): Locale {
  for (const tag of tags) {
    const language = tag.toLowerCase().split(/[-_]/)[0];
    if (language === 'it' || language === 'en') return language;
  }
  return 'en';
}

// Browsers list the user's languages in order; on Android, Hermes reports the system locale.
function deviceTags(): string[] {
  const nav = (globalThis as { navigator?: { languages?: readonly string[] } }).navigator;
  if (nav?.languages?.length) return [...nav.languages];
  return [Intl.DateTimeFormat().resolvedOptions().locale];
}

export let locale: Locale = pickLocale(deviceTags());

export function setLocaleForTests(l: Locale): void {
  locale = l;
}

export function t(key: StringKey, params?: Record<string, string | number>): string {
  const text = TABLES[locale][key] ?? en[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (params && name in params ? String(params[name]) : match));
}

// English and Italian both have one form for 1 and one for everything else.
export function tc(base: string, count: number, params?: Record<string, string | number>): string {
  return t(`${base}_${count === 1 ? 'one' : 'other'}` as StringKey, { count, ...params });
}

const DATE_STYLES: Record<'month' | 'day-month' | 'medium' | 'long', Intl.DateTimeFormatOptions> = {
  month: { month: 'short' }, // "Nov"
  'day-month': { day: 'numeric', month: 'short' }, // "7 Nov"
  medium: { day: 'numeric', month: 'short', year: 'numeric' }, // "7 Nov 2026"
  long: { day: 'numeric', month: 'long', year: 'numeric' }, // "7 November 2026"
};

export function formatDate(ms: number, style: keyof typeof DATE_STYLES): string {
  return new Date(ms).toLocaleDateString(DATE_LOCALE[locale], DATE_STYLES[style]).replace('.', '');
}

// "1.3" in English, "1,3" in Italian.
export function formatDecimal(n: number, digits: number): string {
  const text = n.toFixed(digits);
  return locale === 'it' ? text.replace('.', ',') : text;
}
