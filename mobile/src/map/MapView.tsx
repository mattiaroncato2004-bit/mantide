// Hosts the map page in a WebView and keeps it in sync with the app state.
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import countries from '../geo/countries.json';
import regions from '../geo/it-regions.json';
import provinces from '../geo/it-provinces.json';
import type { Level, MapState } from '../types';
import { mapHtml } from './mapHtml';

// About 430 KB of boundaries, injected once before the page loads.
const GEO_SCRIPT = `window.__MANTIDE_GEO = ${JSON.stringify({ countries, regions, provinces })}; true;`;

type Props = {
  state: MapState;
  onToggle: (level: Level, id: string, name: string) => void;
};

export function MapView({ state, onToggle }: Props) {
  // The library's default type parameter collapses the props to `never` under TS 6; `object` keeps them.
  const webview = useRef<WebView<object>>(null);
  const ready = useRef(false);

  const push = () =>
    webview.current?.injectJavaScript(`window.mantide && window.mantide.setState(${JSON.stringify(state)}); true;`);

  useEffect(() => {
    if (ready.current) push();
  }, [state]);

  const onMessage = (event: WebViewMessageEvent) => {
    const msg = JSON.parse(event.nativeEvent.data);
    if (msg.type === 'ready') {
      ready.current = true;
      push();
    } else if (msg.type === 'toggle') {
      onToggle(msg.level, msg.id, msg.name);
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
