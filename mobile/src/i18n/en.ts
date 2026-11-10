// English strings: the source of truth for every key. Italian lives in it.ts, checked against these keys.
// {name} placeholders are filled by t(); keys ending in _one / _other are picked by tc().
export const en = {
  'test.hello': 'Hello, {name}',
  'count.countries_one': '{count} country',
  'count.countries_other': '{count} countries',
} as const;

export type StringKey = keyof typeof en;
