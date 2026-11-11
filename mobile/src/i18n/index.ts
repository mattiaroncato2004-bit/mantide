// The app's strings in English and Italian, following the device language. Anything that isn't
// Italian gets English. Pure TypeScript, so the test scripts run it in Node.
import { en, type StringKey } from './en';
import { it } from './it';

export type Locale = 'en' | 'it';
export type { StringKey };

export const KM_PER_MILE = 1.609344;
const TABLES: Record<Locale, Record<StringKey, string>> = { en, it };

// The first tag in a language we have decides: ['de-DE', 'it-CH'] is Italian, ['en-US', 'it-IT'] English.
export function pickLocale(tags: readonly string[]): Locale {
  for (const tag of tags) {
    const language = tag.toLowerCase().split(/[-_]/)[0];
    if (language === 'it' || language === 'en') return language;
  }
  return 'en';
}

// The region of the first tag that has one: ['en-US'] is 'US', ['en'] has none.
export function pickRegion(tags: readonly string[]): string | undefined {
  for (const tag of tags) {
    const region = tag.split(/[-_]/).slice(1).find((part) => /^[a-zA-Z]{2}$/.test(part));
    if (region) return region.toUpperCase();
  }
  return undefined;
}

// Miles where people drive in them.
const unitFor = (region: string | undefined): 'km' | 'mi' => (region === 'US' || region === 'GB' ? 'mi' : 'km');
// American dates for English in the US, British for other English.
const dateLocaleFor = (l: Locale, region: string | undefined) => (l === 'it' ? 'it-IT' : region === 'US' ? 'en-US' : 'en-GB');

// Browsers list the user's languages in order; on Android, Hermes reports the system locale.
function deviceTags(): string[] {
  const nav = (globalThis as { navigator?: { languages?: readonly string[] } }).navigator;
  if (nav?.languages?.length) return [...nav.languages];
  return [Intl.DateTimeFormat().resolvedOptions().locale];
}

const tags = deviceTags();
export let locale: Locale = pickLocale(tags);
export let distanceUnit: 'km' | 'mi' = unitFor(pickRegion(tags));
let dateLocale = dateLocaleFor(locale, pickRegion(tags)); // dates and numbers share it

export function setLocaleForTests(l: Locale, region?: string): void {
  locale = l;
  distanceUnit = unitFor(region);
  dateLocale = dateLocaleFor(l, region);
}

// "10 mi" or "16 km", rounded.
export function formatDistance(km: number): string {
  return distanceUnit === 'mi' ? `${Math.round(km / KM_PER_MILE)} mi` : `${Math.round(km)} km`;
}

export function t(key: StringKey, params?: Record<string, string | number>): string {
  const text = TABLES[locale][key] ?? en[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (params && name in params ? String(params[name]) : match));
}

// English and Italian both have one form for 1 and one for everything else.
export function tc(base: string, count: number, params?: Record<string, string | number>): string {
  return t(`${base}_${count === 1 ? 'one' : 'other'}` as StringKey, { ...params, count: formatCount(count) });
}

const DATE_STYLES: Record<'month' | 'day-month' | 'medium' | 'long', Intl.DateTimeFormatOptions> = {
  month: { month: 'short' }, // "Nov"
  'day-month': { day: 'numeric', month: 'short' }, // "7 Nov", "Nov 7" in the US
  medium: { day: 'numeric', month: 'short', year: 'numeric' }, // "7 Nov 2026", "Nov 7, 2026" in the US
  long: { day: 'numeric', month: 'long', year: 'numeric' }, // "7 November 2026"
};

export function formatDate(ms: number, style: keyof typeof DATE_STYLES): string {
  return new Date(ms).toLocaleDateString(dateLocale, DATE_STYLES[style]).replace('.', '');
}

// "3,144" in English, "3.144" in Italian.
export function formatCount(n: number): string {
  return n.toLocaleString(dateLocale, { useGrouping: 'always' } as Intl.NumberFormatOptions);
}

// "1.3" in English, "1,3" in Italian.
export function formatDecimal(n: number, digits: number): string {
  const text = n.toFixed(digits);
  return locale === 'it' ? text.replace('.', ',') : text;
}
