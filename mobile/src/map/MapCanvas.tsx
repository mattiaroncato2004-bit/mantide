// Android map: replaced by native MapLibre in Stage 2a Task 4. Until then App.tsx renders the
// WebView map (MapView.tsx) on Android, so this file only gives the web renderer a native twin.
import type { MapCanvasProps } from './types';

export function MapCanvas(_props: MapCanvasProps) {
  return null;
}
