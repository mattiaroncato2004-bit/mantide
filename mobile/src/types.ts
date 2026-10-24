// Shared types between the React Native app and the map page.

export type Scale = 'global' | 'national' | 'regional' | 'local';

// The map level each scale colors: countries, Italian regions, Italian provinces, H3 hexagons.
export type Level = 'country' | 'region' | 'province' | 'hex';

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
};

// A geotagged photo on the map. thumb is a small "data:image/jpeg;base64,..." URI (see map/thumbs.ts).
export type MapPhoto = { id: string; lon: number; lat: number; takenAt: number; thumb?: string };
