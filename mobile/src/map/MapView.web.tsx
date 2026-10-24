// Browser version of MapView: the same map page, in an iframe instead of a WebView.
// The page talks to window.ReactNativeWebView; here that object forwards to the parent window.
import { useEffect, useRef } from 'react';
import countries from '../geo/countries.json';
import regions from '../geo/it-regions.json';
import provinces from '../geo/it-provinces.json';
import worldRegions from '../geo/world-regions.json';
import worldGroups from '../geo/world-groups.json';
import type { Level, MapState } from '../types';
import { withGeo } from './mapHtml';

const BRIDGE =
  '<script>window.ReactNativeWebView = { postMessage: function (m) { window.parent.postMessage(m, "*"); } };</script>';
const HTML = withGeo({ countries, regions, provinces, worldRegions, worldGroups }).replace('<head>', `<head>\n${BRIDGE}`);

// A blob: URL, not srcDoc: a srcdoc page has a "null" origin and MapLibre never finishes loading
// its GeoJSON sources there. A blob: page keeps the app's origin, so the app can still call it.
const PAGE_URL = URL.createObjectURL(new Blob([HTML], { type: 'text/html' }));

type Props = {
  state: MapState;
  onToggle: (level: Level, id: string, name: string) => void;
  onPhoto?: (id: string) => void;
  onPhotos?: (ids: string[]) => void; // a thumbnail with a number: all the photos behind it
  onEvent?: (id: string) => void;
};

type MapPage = Window & { mantide?: { setState: (s: MapState) => void } };

export function MapView({ state, onToggle, onPhoto, onPhotos, onEvent }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);

  const push = () => (frame.current?.contentWindow as MapPage | null)?.mantide?.setState(state);

  useEffect(() => {
    if (ready.current) push();
  }, [state]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || typeof event.data !== 'string') return;
      const msg = JSON.parse(event.data);
      if (msg.type === 'ready') {
        ready.current = true;
        push();
      } else if (msg.type === 'toggle') {
        onToggle(msg.level, msg.id, msg.name);
      } else if (msg.type === 'photo') {
        onPhoto?.(msg.id);
      } else if (msg.type === 'photos') {
        onPhotos?.(msg.ids);
      } else if (msg.type === 'event') {
        onEvent?.(msg.id);
      } else if (msg.type === 'error') {
        console.warn('[map]', msg.message);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  });

  return (
    <iframe
      ref={frame}
      src={PAGE_URL}
      title="Mappa"
      style={{ border: 0, width: '100%', height: '100%', backgroundColor: '#071521', display: 'block' }}
    />
  );
}
