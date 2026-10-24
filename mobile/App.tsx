// Home of the app: the map of where you've been, at four scales, plus the tab bar.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { MapView } from './src/map/MapView';
import { locate, TOTALS } from './src/geo/locate';
import { ids, useVisited } from './src/state/visited';
import type { Focus, Level, MapState, Scale } from './src/types';

const SCALES: { key: Scale; label: string }[] = [
  { key: 'global', label: 'Globale' },
  { key: 'national', label: 'Nazionale' },
  { key: 'regional', label: 'Regionale' },
  { key: 'local', label: 'Locale' },
];

const TABS = ['Mappa', 'Galleria', 'Per te', 'Interessi'] as const;
type Tab = (typeof TABS)[number];

const COMING: Record<Exclude<Tab, 'Mappa'>, string> = {
  Galleria: 'Le tue foto raggruppate per luogo e data. Tocchi un gruppo e la mappa vola lì.',
  'Per te': 'Eventi della scala che stai guardando, scelti in base a quello che fotografi.',
  Interessi: 'Quello che le tue foto dicono di te, con le foto che lo dimostrano.',
};

// Roncade (TV), home of H-FARM: the focus until the GPS answers.
const DEFAULT_FOCUS: Focus = { country: 'ITA', region: '05', lat: 45.6297, lon: 12.3766 };

const C = {
  bg: '#0b1820',
  surface: 'rgba(11, 24, 32, 0.9)',
  line: 'rgba(242, 245, 243, 0.14)',
  text: '#f2f5f3',
  muted: '#9fb3ad',
  accent: '#ff7a45',
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Home />
    </SafeAreaProvider>
  );
}

function Home() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('Mappa');
  const [scale, setScale] = useState<Scale>('global');
  const [focus, setFocus] = useState<Focus>(DEFAULT_FOCUS);
  const [here, setHere] = useState<[number, number] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { visited, toggleManual, mark } = useVisited();

  // The current position marks the area you are in and centers the scales on it.
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const { coords } = await Location.getCurrentPositionAsync({});
      const place = locate(coords.latitude, coords.longitude);
      setFocus({
        country: place.country ?? DEFAULT_FOCUS.country,
        region: place.region ?? DEFAULT_FOCUS.region,
        lat: coords.latitude,
        lon: coords.longitude,
      });
      setHere([coords.longitude, coords.latitude]);
      mark('gps', place);
    })().catch((e) => console.warn('[gps]', e));
  }, [mark]);

  const mapState: MapState = useMemo(
    () => ({
      scale,
      focus,
      visited: {
        country: ids(visited, 'country'),
        region: ids(visited, 'region'),
        province: ids(visited, 'province'),
        hex: ids(visited, 'hex'),
      },
      points: here ? [here] : [],
    }),
    [scale, focus, visited, here],
  );

  const showToast = (text: string) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  const onToggle = (level: Level, id: string, name: string) => {
    const hadManual = visited[level][id]?.includes('manual');
    toggleManual(level, id);
    showToast(hadManual ? `Segno tolto: ${name}` : `Segnato a mano: ${name}`);
  };

  const countries = mapState.visited.country.length;
  const stats =
    `${countries} ${countries === 1 ? 'paese' : 'paesi'} · ` +
    `${mapState.visited.region.length}/${TOTALS.region} regioni · ` +
    `${mapState.visited.province.length}/${TOTALS.province} province`;

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {/* The map stays mounted under the other tabs, so it never reloads. */}
        <MapView state={mapState} onToggle={onToggle} />

        {tab === 'Mappa' ? (
          <>
            <View style={[styles.header, { top: insets.top + 12 }]}>
              <Text style={styles.title}>Dove sei stato</Text>
              <Text style={styles.stats}>{stats}</Text>
            </View>

            {toast && (
              <View style={[styles.toast, { top: insets.top + 84 }]}>
                <Text style={styles.toastText}>{toast}</Text>
              </View>
            )}

            <View style={styles.scales} accessibilityRole="tablist">
              {SCALES.map((s) => (
                <Pressable
                  key={s.key}
                  onPress={() => setScale(s.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: scale === s.key }}
                  style={[styles.scale, scale === s.key && styles.scaleOn]}
                >
                  <Text style={[styles.scaleText, scale === s.key && styles.scaleTextOn]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={[styles.coming, { paddingTop: insets.top + 24 }]}>
            <Text style={styles.title}>{tab}</Text>
            <Text style={styles.comingText}>{COMING[tab]}</Text>
            <Text style={styles.comingTag}>In arrivo</Text>
          </View>
        )}
      </View>

      <View style={[styles.tabs, { paddingBottom: insets.bottom + 8 }]} accessibilityRole="tablist">
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            style={styles.tab}
          >
            <View style={[styles.tabDot, tab === t && styles.tabDotOn]} />
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1 },
  header: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: C.surface, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
    borderWidth: 1, borderColor: C.line,
  },
  title: { color: C.text, fontSize: 22, fontWeight: '700' },
  stats: { color: C.muted, fontSize: 14, marginTop: 4, fontVariant: ['tabular-nums'] },
  toast: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: C.accent, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
  },
  toastText: { color: '#1a0d06', fontWeight: '600' },
  scales: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: 999, padding: 4,
    borderWidth: 1, borderColor: C.line,
  },
  scale: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  scaleOn: { backgroundColor: C.accent },
  scaleText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  scaleTextOn: { color: '#1a0d06' },
  coming: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: C.bg, paddingHorizontal: 24, gap: 12 },
  comingText: { color: C.muted, fontSize: 16, lineHeight: 23, maxWidth: 420 },
  comingTag: { color: C.accent, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  tabs: {
    flexDirection: 'row', backgroundColor: C.bg, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: C.line,
  },
  tab: { flex: 1, alignItems: 'center', gap: 5 },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent' },
  tabDotOn: { backgroundColor: C.accent },
  tabText: { color: C.muted, fontSize: 12, fontWeight: '600' },
  tabTextOn: { color: C.text },
});
