// English strings: the source of truth for every key. Italian lives in it.ts, checked against these keys.
// {name} placeholders are filled by t(); keys ending in _one / _other are picked by tc().
export const en = {
  'test.hello': 'Hello, {name}',
  'count.countries_one': '{count} country',
  'count.countries_other': '{count} countries',

  'interest.street-art': 'Street art',
  'interest.food': 'Food and restaurants',
  'interest.sea': 'Sea and beaches',
  'interest.mountains': 'Mountains and hiking',
  'interest.art': 'Art and museums',
  'interest.architecture': 'Architecture',
  'interest.live-music': 'Live music',
  'interest.nature': 'Nature and animals',
  'interest.sport': 'Sport',
  'interest.wine': 'Wine and aperitifs',
  'interest.history': 'History and monuments',
  'interest.nightlife': 'Nightlife',

  // Why an event is suggested: "You have 41 photos of street art and 12 of live music".
  'why.photos': 'You have {list}',
  'why.first': '{count} photos of {interest}',
  'why.next': '{count} of {interest}',
  'why.interest': "You're into {list}",
  'list.and': 'and',
} as const;

export type StringKey = keyof typeof en;
