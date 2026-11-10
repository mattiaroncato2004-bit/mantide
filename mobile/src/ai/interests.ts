// The fixed list of interests Gemma can assign to a photo. Events use the same ids.
import { t, type StringKey } from '../i18n';

export const INTEREST_IDS = [
  'street-art', 'food', 'sea', 'mountains', 'art', 'architecture',
  'live-music', 'nature', 'sport', 'wine', 'history', 'nightlife',
] as const;

export type InterestId = (typeof INTEREST_IDS)[number];

export const labelOf = (id: InterestId) => t(`interest.${id}` as StringKey);
