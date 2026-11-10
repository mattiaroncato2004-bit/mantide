// The browser draws the map with MapCanvas.web.tsx; this twin keeps react-native-webview out of the
// web bundle until MapView.tsx is removed in Stage 2a Task 4.
import type { MapState } from '../types';

export function MapView(_props: { state: MapState; [handler: string]: unknown }) {
  return null;
}
