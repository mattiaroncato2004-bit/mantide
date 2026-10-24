// The fixed list of interests Gemma can assign to a photo. Events use the same ids.
export const INTERESTS = [
  { id: 'street-art', label: 'Street art' },
  { id: 'cibo', label: 'Cibo e ristoranti' },
  { id: 'mare', label: 'Mare e spiagge' },
  { id: 'montagna', label: 'Montagna ed escursioni' },
  { id: 'arte', label: 'Arte e musei' },
  { id: 'architettura', label: 'Architettura' },
  { id: 'musica', label: 'Musica dal vivo' },
  { id: 'natura', label: 'Natura e animali' },
  { id: 'sport', label: 'Sport' },
  { id: 'vino', label: 'Vino e aperitivi' },
  { id: 'storia', label: 'Storia e monumenti' },
  { id: 'notte', label: 'Vita notturna' },
] as const;

export type InterestId = (typeof INTERESTS)[number]['id'];

export const INTEREST_IDS = INTERESTS.map((i) => i.id) as InterestId[];

export const labelOf = (id: InterestId) => INTERESTS.find((i) => i.id === id)?.label ?? id;
