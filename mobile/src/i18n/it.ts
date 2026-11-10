// Italian strings. `satisfies` makes a missing or misspelled key a type error.
import type { StringKey } from './en';

export const it = {
  'test.hello': 'Ciao, {name}',
  'count.countries_one': '{count} paese',
  'count.countries_other': '{count} paesi',
} satisfies Record<StringKey, string>;
