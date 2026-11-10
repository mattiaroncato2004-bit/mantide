// The props both map renderers take: MapCanvas.tsx (native MapLibre, Android) and MapCanvas.web.tsx
// (MapLibre GL JS). Everything they draw is computed beforehand by src/map/model.ts.
import type { Feature, LineString } from 'geojson';
import type { Level } from '../types';
import type { Areas, BBox, distanceRings, PhotoCluster } from './model';
import type { Basemap } from './style';

export type MapView = { zoom: number; bounds: BBox; center: [number, number] };

// A new `key` moves the camera; the same key leaves the map where the user put it.
export type CameraTarget = { key: number } & ({ center: [number, number]; zoom: number } | { bounds: BBox });

export type MapCanvasProps = {
  basemap: Basemap;
  areas: Areas;
  clusters: PhotoCluster[];
  thumbs: Record<string, string>; // photo id → image URI
  journey: Feature<LineString> | null;
  events: { id: string; lon: number; lat: number; selected: boolean }[];
  you: { lon: number; lat: number; label: string } | null;
  rings: ReturnType<typeof distanceRings>;
  camera: CameraTarget;
  sheetHeight: number; // the map keeps what it frames above the sheet
  onViewChange(view: MapView): void;
  onAreaPress(level: Level, id: string): void;
  onClusterPress(key: string): void;
  onPhotoPress(id: string): void;
  onEventPress(id: string): void;
};
