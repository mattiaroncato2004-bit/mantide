// Home of the app: the map of where you've been, at four scales, plus the tab bar.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { MapView } from './src/map/MapView';
import { locate, TOTALS } from './src/geo/locate';
import { ids, useVisited } from './src/state/visited';
import {
  askForAllPhotos, groupByPlace, loadPhotos, requestGallery, scanGallery,
  type Photo, type PlaceGroup,
} from './src/gallery/photos';
import { GalleryScreen } from './src/screens/GalleryScreen';
import { InterestsScreen, type InterestRow } from './src/screens/InterestsScreen';
import { ForYouScreen } from './src/screens/ForYouScreen';
import { makeThumbs } from './src/map/thumbs';
import { analyzePhoto, GEMMA_URL, loadAnalyses, sample, saveAnalyses, type Analysis } from './src/ai/gemma';
import { labelOf, type InterestId } from './src/ai/interests';
import { EVENTS, profileFromCounts, recommend } from './src/events/recommend';
import { nameOf } from './src/geo/locate';
import { C } from './src/theme';
import type { Focus, Level, MapState, Scale } from './src/types';

const SCALES: { key: Scale; label: string }[] = [
  { key: 'global', label: 'Globale' },
  { key: 'national', label: 'Nazionale' },
  { key: 'regional', label: 'Regionale' },
  { key: 'local', label: 'Locale' },
];

const TABS = ['Mappa', 'Galleria', 'Per te', 'Interessi'] as const;
type Tab = (typeof TABS)[number];

// Roncade (TV), home of H-FARM: the focus until the GPS answers.
const DEFAULT_FOCUS: Focus = { country: 'ITA', region: '05', lat: 45.6297, lon: 12.3766 };

// The map draws one dot per photo; past this many it only gets slower, not clearer.
const MAX_POINTS = 1500;

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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [galleryStatus, setGalleryStatus] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [removed, setRemoved] = useState<InterestId[]>([]);
  const [opened, setOpened] = useState<string | null>(null); // photo id shown full screen
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
      mark('gps', [place]);
    })().catch((e) => console.warn('[gps]', e));
  }, [mark]);

  useEffect(() => {
    loadPhotos().then(setPhotos).catch((e) => console.warn('[photos] load failed', e));
    loadAnalyses().then(setAnalyses).catch((e) => console.warn('[gemma] load failed', e));
  }, []);

  // Small thumbnails for the map, computed once per photo and cached.
  useEffect(() => {
    if (!photos.length) return;
    makeThumbs(photos.slice(0, MAX_POINTS)).then(setThumbs).catch((e) => console.warn('[thumbs]', e));
  }, [photos]);

  const groups = useMemo(() => groupByPlace(photos), [photos]);

  const scan = useCallback(async () => {
    setScanning(true);
    try {
      const access = await requestGallery();
      if (access === 'denied') {
        setGalleryStatus('Senza il permesso alle foto non posso leggere la galleria. Attivalo nelle impostazioni.');
        return;
      }
      if (access === 'limited') {
        setGalleryStatus('Hai condiviso solo alcune foto: scegli "Consenti tutte" per vedere tutti i tuoi luoghi.');
        await askForAllPhotos();
      }
      const found = await scanGallery((read, withGps) => setGalleryStatus(`Lette ${read} foto, ${withGps} con posizione`));
      setPhotos(found);
      mark('photo', found);
    } catch (e) {
      console.warn('[photos] scan failed', e);
      setGalleryStatus(`Lettura interrotta: ${String(e)}`);
    } finally {
      setScanning(false);
    }
  }, [mark]);

  // Gemma looks at a sample of the photos (at most 3 per place and day) and labels each one.
  const analyze = useCallback(async () => {
    const todo = sample(photos).filter((p) => !analyses[p.id]);
    if (!todo.length) {
      setAiStatus('Tutte le foto scelte sono già state analizzate.');
      return;
    }
    setAnalyzing(true);
    const results = { ...analyses };
    try {
      for (const [i, photo] of todo.entries()) {
        setAiStatus(`Foto ${i + 1} di ${todo.length}…`);
        try {
          const analysis = await analyzePhoto(photo.uri);
          results[photo.id] = analysis;
          setAnalyses({ ...results });
          await saveAnalyses(results);
          setAiStatus(`Foto ${i + 1} di ${todo.length}: ${analysis.scene} → ${analysis.interests.map(labelOf).join(', ')}`);
        } catch (e) {
          if (e instanceof TypeError) throw e; // network error: Gemma is not reachable
          console.warn('[gemma] photo skipped', photo.id, e);
        }
      }
      setAiStatus(`Fatto: ${Object.keys(results).length} foto analizzate.`);
    } catch (e) {
      console.warn('[gemma]', e);
      setAiStatus(`Non trovo Gemma su ${GEMMA_URL}: avvia "litert-lm serve" sul computer (vedi local-ai/README.md).`);
    } finally {
      setAnalyzing(false);
    }
  }, [photos, analyses]);

  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

  const interestRows: InterestRow[] = useMemo(() => {
    const rows = new Map<InterestId, InterestRow>();
    for (const [id, a] of Object.entries(analyses)) {
      const photo = byId.get(id);
      if (!photo) continue;
      for (const interest of a.interests) {
        if (removed.includes(interest)) continue;
        const row = rows.get(interest) ?? { id: interest, count: 0, share: 0, photos: [] };
        row.count++;
        row.photos.push(photo);
        rows.set(interest, row);
      }
    }
    const max = Math.max(1, ...[...rows.values()].map((r) => r.count));
    return [...rows.values()].map((r) => ({ ...r, share: r.count / max })).sort((a, b) => b.count - a.count);
  }, [analyses, byId, removed]);

  const recommendations = useMemo(() => {
    const profile = profileFromCounts(Object.fromEntries(interestRows.map((r) => [r.id, r.count])));
    return recommend(EVENTS, profile, scale, focus);
  }, [interestRows, scale, focus]);

  const openGroup = (group: PlaceGroup) => {
    setFocus({
      country: group.place.country ?? focus.country,
      region: group.place.region ?? focus.region,
      lat: group.lat,
      lon: group.lon,
    });
    setScale(group.place.province ? 'regional' : 'national');
    setTab('Mappa');
  };

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
      photos: photos.slice(0, MAX_POINTS).map((p) => ({
        id: p.id, lon: p.lon, lat: p.lat, takenAt: p.takenAt, thumb: thumbs[p.id],
      })),
    }),
    [scale, focus, visited, here, photos, thumbs],
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
        <MapView state={mapState} onToggle={onToggle} onPhoto={setOpened} />

        {tab === 'Mappa' && (
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
        )}

        {tab === 'Galleria' && (
          <GalleryScreen
            groups={groups}
            status={galleryStatus}
            scanning={scanning}
            onScan={scan}
            onOpen={openGroup}
            topInset={insets.top}
          />
        )}

        {tab === 'Interessi' && (
          <InterestsScreen
            rows={interestRows}
            analyzed={Object.keys(analyses).length}
            status={aiStatus}
            running={analyzing}
            canRun={photos.length > 0}
            onRun={analyze}
            onRemove={(id) => setRemoved((r) => [...r, id])}
            topInset={insets.top}
          />
        )}

        {tab === 'Per te' && (
          <ForYouScreen
            recommendations={recommendations}
            scaleLabel={SCALES.find((s) => s.key === scale)?.label ?? ''}
            hasProfile={interestRows.length > 0}
            topInset={insets.top}
          />
        )}

        {opened && byId.get(opened) && (
          <PhotoPreview photo={byId.get(opened)!} analysis={analyses[opened]} onClose={() => setOpened(null)} />
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

// Full-screen photo opened from the map: where, when, and what Gemma saw in it.
function PhotoPreview({ photo, analysis, onClose }: { photo: Photo; analysis?: Analysis; onClose: () => void }) {
  const where = photo.province ? nameOf('province', photo.province) : nameOf('country', photo.country);
  const when = new Date(photo.takenAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <Pressable style={styles.preview} onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi la foto">
      <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="contain" />
      <View style={styles.previewInfo}>
        <Text style={styles.title}>{where}</Text>
        <Text style={styles.stats}>{when}</Text>
        {analysis && (
          <Text style={styles.previewAi}>
            Gemma: {analysis.scene} · {analysis.interests.map(labelOf).join(', ')}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  preview: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(5, 12, 16, 0.96)', justifyContent: 'center', padding: 16, gap: 16 },
  previewImage: { width: '100%', height: '60%', borderRadius: 12 },
  previewInfo: { gap: 4 },
  previewAi: { color: C.accent, fontSize: 15, fontWeight: '600', marginTop: 6 },
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
  toastText: { color: C.onAccent, fontWeight: '600' },
  scales: {
    position: 'absolute', left: 16, right: 16, bottom: 16,
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: 999, padding: 4,
    borderWidth: 1, borderColor: C.line,
  },
  scale: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  scaleOn: { backgroundColor: C.accent },
  scaleText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  scaleTextOn: { color: C.onAccent },
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
