// Shared types between the React Native app and the map page.

export type Scale = 'global' | 'national' | 'regional' | 'local';

// The map level the global, national and regional scales color: countries, Italian regions,
// Italian provinces. The local scale colors nothing: it shows photos and events around you.
export type Level = 'country' | 'region' | 'province';

// How a place became visited.
export type Source = 'manual' | 'gps' | 'photo';

export type Focus = {
  country: string; // Natural Earth ADM0_A3, e.g. "ITA"
  region: string; // ISTAT region code, e.g. "05" (Veneto)
  lat: number;
  lon: number;
};

// What the map page needs to draw: plain arrays so it serializes to JSON as is.
export type MapState = {
  scale: Scale;
  focus: Focus;
  visited: Record<Level, string[]>;
  points: [number, number][]; // [lon, lat] of the current position
  photos: MapPhoto[];
  events: MapEvent[]; // drawn at the local scale only
  selectedEvent: string | null; // the event picked on the map or in the panel: bigger dot, map centred on it
  timeline: { until: number } | null; // only photos taken until then, with the journey animated
  chromeTop: number; // px from the top where the app's header ends: map controls go below it
  labels: { youAreHere: string; distancesFromHere: string }; // the page's only text, in the app's language
};

// A geotagged photo on the map. thumb is a small "data:image/jpeg;base64,..." URI (see map/thumbs.ts).
export type MapPhoto = { id: string; lon: number; lat: number; takenAt: number; thumb?: string };

// An event for you, as a dot on the map at the local scale.
export type MapEvent = { id: string; lon: number; lat: number };
