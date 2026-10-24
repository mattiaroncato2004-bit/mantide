// Hosts the map page in a WebView and keeps it in sync with the app state.
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import countries from '../geo/countries.json';
import regions from '../geo/it-regions.json';
import provinces from '../geo/it-provinces.json';
import type { Level, MapPhoto, MapState } from '../types';
import { mapHtml } from './mapHtml';

// About 430 KB of boundaries, injected once before the page loads.
const GEO_SCRIPT = `window.__MANTIDE_GEO = ${JSON.stringify({ countries, regions, provinces })}; true;`;

type Props = {
  state: MapState;
  onToggle: (level: Level, id: string, name: string) => void;
  onPhoto?: (id: string) => void;
};

// Cheap fingerprint of the photos, so the thumbnails (often megabytes) are sent only when they change.
const photoKey = (photos: MapPhoto[] | undefined) =>
  (photos ?? []).map((p) => `${p.id}@${p.lon},${p.lat}${p.thumb ? '+' : ''}`).join('|');

export function MapView({ state, onToggle, onPhoto }: Props) {
  // The library's default type parameter collapses the props to `never` under TS 6; `object` keeps them.
  const webview = useRef<WebView<object>>(null);
  const ready = useRef(false);
  const sentPhotos = useRef<string | null>(null);

  const push = () => {
    const key = photoKey(state.photos);
    const { photos, ...rest } = state;
    const next = key === sentPhotos.current ? rest : { ...rest, photos: photos ?? [] };
    sentPhotos.current = key;
    webview.current?.injectJavaScript(`window.mantide && window.mantide.setState(${JSON.stringify(next)}); true;`);
  };

  useEffect(() => {
    if (ready.current) push();
  }, [state]);

  const onMessage = (event: WebViewMessageEvent) => {
    const msg = JSON.parse(event.nativeEvent.data);
    if (msg.type === 'ready') {
      ready.current = true;
      sentPhotos.current = null; // a (re)loaded page has no photos yet
      push();
    } else if (msg.type === 'toggle') {
      onToggle(msg.level, msg.id, msg.name);
    } else if (msg.type === 'photo') {
      onPhoto?.(msg.id);
    } else if (msg.type === 'error') {
      console.warn('[map]', msg.message);
    }
  };

  return (
    <WebView<object>
      ref={webview}
      originWhitelist={['*']}
      source={{ html: mapHtml }}
      injectedJavaScriptBeforeContentLoaded={GEO_SCRIPT}
      onMessage={onMessage}
      style={styles.map}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#071521' },
});
