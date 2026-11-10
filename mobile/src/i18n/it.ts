// Italian strings. `satisfies` makes a missing or misspelled key a type error.
import type { StringKey } from './en';

export const it = {
  'test.hello': 'Ciao, {name}',
  'count.countries_one': '{count} paese',
  'count.countries_other': '{count} paesi',

  'interest.street-art': 'Street art',
  'interest.food': 'Cibo e ristoranti',
  'interest.sea': 'Mare e spiagge',
  'interest.mountains': 'Montagna ed escursioni',
  'interest.art': 'Arte e musei',
  'interest.architecture': 'Architettura',
  'interest.live-music': 'Musica dal vivo',
  'interest.nature': 'Natura e animali',
  'interest.sport': 'Sport',
  'interest.wine': 'Vino e aperitivi',
  'interest.history': 'Storia e monumenti',
  'interest.nightlife': 'Vita notturna',

  'why.photos': 'Hai {list}',
  'why.first': '{count} foto di {interest}',
  'why.next': '{count} di {interest}',
  'why.interest': 'Ti interessa {list}',
  'list.and': 'e',
} satisfies Record<StringKey, string>;
