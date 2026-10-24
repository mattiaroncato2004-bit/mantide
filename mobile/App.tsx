// Mantide: one screen, the map of where you've been at four scales. Your gallery fills it in;
// at the local scale it shows events around you chosen from what you photograph.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_400Regular, BricolageGrotesque_500Medium, BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { MapView } from './src/map/MapView';
import { makeThumbs } from './src/map/thumbs';
import { centerOf, countryOfRegion, locate, nameOf, placeOfProvince } from './src/geo/locate';
import { ids, useVisited } from './src/state/visited';
import { askForAllPhotos, forgetPhotos, loadPhotos, requestGallery, scanGallery, type Photo } from './src/gallery/photos';
import {
  analyzePhoto, demoAnalysis, GEMMA_URL, loadAnalyses, sample, saveAnalyses, whereGemmaRuns, type Analysis,
} from './src/ai/gemma';
import { labelOf, type InterestId } from './src/ai/interests';
import { EVENTS, profileFromCounts, recommend, recommendIn, type Event } from './src/events/recommend';
import { Welcome } from './src/screens/Welcome';
import { LocalPanel } from './src/screens/LocalPanel';
import { PlaceSheet, type SelectedPlace } from './src/screens/PlaceSheet';
import { PassportSheet } from './src/screens/PassportSheet';
import { PhotoGroup } from './src/screens/PhotoGroup';
import { TimelineBar } from './src/screens/TimelineBar';
import { passport } from './src/stats/passport';
import Storage from './src/storage';
import { C, F, R } from './src/theme';
import type { Focus, Level, MapState, Scale } from './src/types';

const SCALES: { key: Scale; label: string }[] = [
  { key: 'global', label: 'Globale' },
  { key: 'national', label: 'Nazionale' },
  { key: 'regional', label: 'Regionale' },
  { key: 'local', label: 'Locale' },
];

// Roncade (TV), home of H-FARM: the focus until the GPS answers.
const DEFAULT_FOCUS: Focus = { country: 'ITA', region: '05', lat: 45.6297, lon: 12.3766 };

// The map draws one thumbnail per photo; past this many it only gets slower, not clearer.
const MAX_POINTS = 1500;

// The timeline's play button moves one photo forward this often.
const PLAY_STEP_MS = 500;

// Whether the user let the app read the gallery: asked once, at first launch.
type GalleryChoice = 'all' | 'none';
const CHOICE_KEY = 'gallery:choice';

export default function App() {
  // The two type families of src/theme.ts. On failure the app still starts, with system fonts.
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular, BricolageGrotesque_500Medium, BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
    IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_600SemiBold,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {fontsLoaded || fontError ? <Home /> : <View style={styles.root} />}
    </SafeAreaProvider>
  );
}

function Home() {
  const insets = useSafeAreaInsets();
  const [choice, setChoice] = useState<GalleryChoice | null | undefined>(undefined); // undefined: still loading
  const [scale, setScale] = useState<Scale>('global');
  const [focus, setFocus] = useState<Focus>(DEFAULT_FOCUS);
  const [here, setHere] = useState<[number, number] | null>(null);
  const [home, setHome] = useState<Focus>(DEFAULT_FOCUS); // where you are; focus moves when you tap a place
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null); // gallery and Gemma progress, in the header
  const [removed, setRemoved] = useState<InterestId[]>([]);
  const [opened, setOpened] = useState<string | null>(null); // photo shown full screen
  const [group, setGroup] = useState<string[] | null>(null); // the photos behind a numbered thumbnail
  const [galleryOpen, setGalleryOpen] = useState(false); // all your photos, and the gallery consent
  const [reusedAnswers, setReusedAnswers] = useState(0); // demo photos labelled with Gemma's earlier answers
  const [selected, setSelected] = useState<SelectedPlace | null>(null); // area tapped on the map
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null); // event dot or card tapped
  const [passportOpen, setPassportOpen] = useState(false);
  const [chromeTop, setChromeTop] = useState(120);
  const [timelineOn, setTimelineOn] = useState(false);
  const [timelineIndex, setTimelineIndex] = useState(0); // photo reached on the timeline, oldest first
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resumed = useRef(false);
  const { visited, toggleManual, mark } = useVisited();

  // The current position marks the area you are in and centers the scales on it.
  useEffect(() => {
    (async () => {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') return;
      const { coords } = await Location.getCurrentPositionAsync({});
      const place = locate(coords.latitude, coords.longitude);
      const position = {
        country: place.country ?? DEFAULT_FOCUS.country,
        region: place.region ?? '',
        lat: coords.latitude,
        lon: coords.longitude,
      };
      setHome(position);
      setFocus(position);
      setHere([coords.longitude, coords.latitude]);
      mark('gps', [place]);
    })().catch((e) => console.warn('[gps]', e));
  }, [mark]);

  useEffect(() => {
    Promise.all([Storage.getItem(CHOICE_KEY), loadPhotos(), loadAnalyses()])
      .then(([saved, savedPhotos, savedAnalyses]) => {
        setPhotos(savedPhotos);
        setAnalyses(savedAnalyses);
        setChoice(saved === 'all' || saved === 'none' ? saved : null);
      })
      .catch((e) => {
        console.warn('[start] load failed', e);
        setChoice(null);
      });
  }, []);

  // Small thumbnails for the map, computed once per photo and cached.
  useEffect(() => {
    if (!photos.length) return;
    makeThumbs(photos.slice(0, MAX_POINTS)).then(setThumbs).catch((e) => console.warn('[thumbs]', e));
  }, [photos]);

  // Gemma looks at a sample of the photos (at most 3 per place and day) and labels each one.
  const analyze = useCallback(async (list: Photo[], prior: Record<string, Analysis>) => {
    const todo = sample(list).filter((p) => !prior[p.id]);
    if (!todo.length) {
      setStatus(null);
      return;
    }
    const results = { ...prior };
    try {
      for (const [i, photo] of todo.entries()) {
        setStatus(`Gemma sta guardando le tue foto · ${i + 1} di ${todo.length}`);
        try {
          results[photo.id] = await analyzePhoto(photo.uri);
          setAnalyses({ ...results });
          await saveAnalyses(results);
        } catch (e) {
          if (e instanceof TypeError) throw e; // network error: Gemma is not reachable
          console.warn('[gemma] photo skipped', photo.id, e);
        }
      }
      setStatus(null);
    } catch (e) {
      // Gemma unreachable: for demo photos, show the answers Gemma gave earlier on the same files.
      console.warn('[gemma]', e);
      let reused = 0;
      for (const photo of todo) {
        const saved = !results[photo.id] && demoAnalysis(photo.filename);
        if (saved) {
          results[photo.id] = saved;
          reused++;
        }
      }
      setAnalyses({ ...results });
      await saveAnalyses(results);
      // With earlier answers the app works as usual: say so quietly in the Locale panel, not in the header.
      setReusedAnswers(reused);
      setStatus(reused ? null : `Non trovo Gemma su ${GEMMA_URL}: avvia "litert-lm serve" sul computer.`);
    }
  }, []);

  // Reads the gallery, marks the places it shows, then lets Gemma find your interests.
  const readGallery = useCallback(async () => {
    setBusy(true);
    try {
      const access = await requestGallery();
      if (access === 'denied') {
        setStatus('Senza il permesso alle foto la mappa si riempie solo a mano e col GPS.');
        return;
      }
      if (access === 'limited') {
        setStatus('Hai condiviso solo alcune foto: scegli "Consenti tutte" per vedere tutti i tuoi luoghi.');
        await askForAllPhotos();
      }
      const found = await scanGallery((read, withGps) => setStatus(`Leggo la galleria · ${read} foto, ${withGps} con posizione`));
      setPhotos(found);
      mark('photo', found);
      await analyze(found, await loadAnalyses());
    } catch (e) {
      console.warn('[photos] scan failed', e);
      setStatus(`Lettura interrotta: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [mark, analyze]);

  // On later launches, finish whatever Gemma had not looked at yet; if the saved photos were
  // dropped (a new data version), read the gallery again.
  useEffect(() => {
    if (resumed.current || choice !== 'all') return;
    resumed.current = true;
    if (!photos.length) {
      readGallery();
      return;
    }
    setBusy(true);
    analyze(photos, analyses).finally(() => setBusy(false));
  }, [choice, photos, analyses, analyze, readGallery]);

  const allowGallery = () => {
    setChoice('all');
    Storage.setItem(CHOICE_KEY, 'all');
    resumed.current = true; // readGallery runs Gemma itself
    readGallery();
  };

  const skipGallery = () => {
    setChoice('none');
    Storage.setItem(CHOICE_KEY, 'none');
    setPhotos([]);
    setThumbs({});
    setAnalyses({});
    forgetPhotos();
    saveAnalyses({});
    setStatus(null);
  };

  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

  // Your interests: how many analysed photos show each one, minus the ones you removed.
  const profile = useMemo(() => {
    const counts: Partial<Record<InterestId, number>> = {};
    for (const [id, a] of Object.entries(analyses)) {
      if (!byId.has(id)) continue;
      for (const i of a.interests) if (!removed.includes(i)) counts[i] = (counts[i] ?? 0) + 1;
    }
    return profileFromCounts(counts);
  }, [analyses, byId, removed]);

  const localRecommendations = useMemo(() => recommend(EVENTS, profile, 'local', focus), [profile, focus]);

  // The place sheet: photos taken in the tapped area and events there for you.
  const placePhotos = useMemo(() => {
    if (!selected) return [];
    const level = selected.level;
    return photos.filter((p) => p[level] === selected.id);
  }, [selected, photos]);

  const placeRecommendations = useMemo(() => {
    if (!selected) return [];
    const { level, id } = selected;
    const inPlace = (e: Event) =>
      level === 'country' ? e.country === id : level === 'region' ? e.region === id : locate(e.lat, e.lon).province === id;
    return recommendIn(EVENTS, profile, inPlace, focus);
  }, [selected, profile, focus]);

  // Your photos oldest first: the timeline walks along them.
  const journey = useMemo(() => [...photos].sort((a, b) => a.takenAt - b.takenAt), [photos]);
  const reached = timelineOn ? journey[Math.min(timelineIndex, journey.length - 1)] : undefined;

  // Play: one photo forward at a time, stopping at the newest.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setTimelineIndex((i) => {
        if (i >= journey.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, PLAY_STEP_MS);
    return () => clearInterval(timer);
  }, [playing, journey.length]);

  // Marks for the timeline: one per photo; a trip (more than 4 days since the previous photo)
  // starts with "mese 'aa", left out where it would overlap the previous label.
  const timelineMarks = useMemo(() => {
    const last = Math.max(1, journey.length - 1);
    let lastLabelAt = -1;
    return journey.map((p, i) => {
      const at = i / last;
      const tripStart = i === 0 || p.takenAt - journey[i - 1].takenAt > 4 * 24 * 3600 * 1000;
      if (!tripStart || at - lastLabelAt < 0.14) return { at };
      lastLabelAt = at;
      const d = new Date(p.takenAt);
      return { at, label: `${d.toLocaleDateString('it-IT', { month: 'short' })} '${String(d.getFullYear()).slice(2)}` };
    });
  }, [journey]);

  const openTimeline = () => {
    setSelected(null);
    setTimelineIndex(0);
    setTimelineOn(true);
    setPlaying(true);
  };

  const closeTimeline = () => {
    setPlaying(false);
    setTimelineOn(false);
  };

  const mapState: MapState = useMemo(
    () => ({
      scale,
      focus,
      visited: {
        country: ids(visited, 'country'),
        region: ids(visited, 'region'),
        province: ids(visited, 'province'),
      },
      points: here ? [here] : [],
      photos: photos.slice(0, MAX_POINTS).map((p) => ({
        id: p.id, lon: p.lon, lat: p.lat, takenAt: p.takenAt, thumb: thumbs[p.id],
      })),
      events: scale === 'local' && !reached ? localRecommendations.map((r) => ({ id: r.event.id, lon: r.event.lon, lat: r.event.lat })) : [],
      selectedEvent,
      timeline: reached ? { until: reached.takenAt } : null,
      chromeTop,
    }),
    [scale, focus, visited, here, photos, thumbs, localRecommendations, selectedEvent, reached, chromeTop],
  );

  const showToast = (text: string) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  const toggleSelected = () => {
    if (!selected) return;
    const { level, id, name } = selected;
    const hadManual = visited[level][id]?.includes('manual');
    toggleManual(level, id);
    showToast(hadManual ? `Segno tolto: ${name}` : `Segnato a mano: ${name}`);
  };

  const changeScale = (next: Scale) => {
    setScale(next);
    setSelected(null);
    setSelectedEvent(null);
  };

  const countries = mapState.visited.country.length;
  const regions = mapState.visited.region.length;
  const stats =
    `${countries} ${countries === 1 ? 'paese' : 'paesi'} · ` +
    `${regions} ${regions === 1 ? 'regione' : 'regioni'} · ` +
    `${mapState.visited.province.length} province`;

  const travel = useMemo(() => passport(mapState.visited, focus.country), [mapState.visited, focus.country]);

  const herePlace = locate(focus.lat, focus.lon);
  const localName = herePlace.province ? nameOf('province', herePlace.province) : nameOf('country', herePlace.country);
  const localStatus =
    choice === 'none'
      ? 'Collega la galleria dal pulsante Galleria qui sopra, a destra: Gemma capirà cosa ti piace e qui compariranno gli eventi giusti.'
      : busy
        ? 'Gemma sta guardando le tue foto: gli eventi arrivano appena ha capito cosa ti piace.'
        : 'Nessun evento qui vicino per i tuoi interessi.';

  return (
    <View style={styles.root}>
      <MapView
        state={mapState}
        onToggle={(level: Level, id: string, name: string) => {
          setSelectedEvent(null);
          setSelected({ level, id, name });
          // The scales follow the place you tapped: France at Globale, then Nazionale shows French regions.
          // A country goes to the region where you took most photos there (or its middle).
          let country = focus.country;
          let region = id;
          if (level === 'country') {
            country = id;
            const counts = new Map<string, number>();
            for (const p of photos) if (p.country === id && p.region) counts.set(p.region, (counts.get(p.region) ?? 0) + 1);
            const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
            const [cx, cy] = centerOf(id) ?? [focus.lon, focus.lat];
            region = top ?? locate(cy, cx).region ?? '';
          } else if (level === 'region') {
            country = countryOfRegion(id) ?? focus.country;
          } else {
            const owner = placeOfProvince(id);
            country = owner?.country ?? focus.country;
            region = owner?.region ?? focus.region;
          }
          const [lon, lat] = (level === 'country' ? centerOf(region) : undefined) ?? centerOf(id) ?? [focus.lon, focus.lat];
          setFocus({ country, region, lat, lon });
          // Tapping goes one scale down, with the place's sheet still open: a country opens its regions,
          // a region (Lazio at Nazionale) its provinces. Provinces stay at Regionale: Locale has no areas.
          if (level === 'country') setScale('national');
          else if (level === 'region') setScale('regional');
        }}
        onPhoto={setOpened}
        onPhotos={setGroup}
        onEvent={(id) => setSelectedEvent(id)}
      />

      <View
        style={[styles.header, { top: insets.top + 8 }]}
        onLayout={(e) => setChromeTop(insets.top + 8 + e.nativeEvent.layout.height + 8)}
      >
        <Pressable
          onPress={() => setPassportOpen(true)}
          style={({ pressed }) => [styles.counts, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${stats}. Livello ${travel.level.name}. Apri il passaporto`}
        >
          {([
            [countries, countries === 1 ? 'paese' : 'paesi'],
            [regions, regions === 1 ? 'regione' : 'regioni'],
            [mapState.visited.province.length, mapState.visited.province.length === 1 ? 'provincia' : 'province'],
          ] as const).map(([n, label], i) => (
            <View key={i} style={[styles.count, i > 0 && styles.countRule]}>
              <Text style={styles.countN}>{n}</Text>
              <Text style={styles.countLabel}>{label}</Text>
            </View>
          ))}
          <View style={[styles.count, styles.countRule, styles.levelCell]}>
            <Text style={styles.level} numberOfLines={1}>{travel.level.name}</Text>
            <Text style={styles.countLabel} numberOfLines={1}>passaporto ›</Text>
          </View>
        </Pressable>
        {status && <Text style={styles.status} numberOfLines={2}>{status}</Text>}
      </View>

      {toast && (
        <View style={[styles.toast, { top: insets.top + 132 }]} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <View style={[styles.bottom, { paddingBottom: (scale === 'local' || selected) && !timelineOn ? 0 : insets.bottom + 16 }]}>
        {timelineOn && reached ? (
          <TimelineBar
            count={journey.length}
            index={Math.min(timelineIndex, journey.length - 1)}
            onChange={(i) => {
              setPlaying(false);
              setTimelineIndex(i);
            }}
            playing={playing}
            onTogglePlay={() => {
              if (timelineIndex >= journey.length - 1) setTimelineIndex(0);
              setPlaying((p) => !p);
            }}
            place={reached.province ? nameOf('province', reached.province) : nameOf('country', reached.country)}
            marks={timelineMarks}
            onClose={closeTimeline}
          />
        ) : (
          <View style={styles.tools}>
            {journey.length > 1 && (
              <Pressable
                onPress={openTimeline}
                style={({ pressed }) => [styles.timelineButton, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.timelineButtonText}>▶ Linea del tempo</Text>
              </Pressable>
            )}
            {(focus.lat !== home.lat || focus.lon !== home.lon) && (
              <Pressable
                onPress={() => {
                  setSelected(null);
                  setFocus(home);
                }}
                style={({ pressed }) => [styles.timelineButton, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.timelineButtonText}>◎ Torna qui</Text>
              </Pressable>
            )}
            {/* Far right, apart from the map tools on the left. */}
            <Pressable
              onPress={() => setGalleryOpen(true)}
              style={({ pressed }) => [styles.timelineButton, styles.galleryTool, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Apri la galleria"
            >
              <View style={[styles.galleryDot, choice === 'all' && styles.galleryDotOn]} />
              <Text style={styles.timelineButtonText}>Galleria</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.scales} accessibilityRole="tablist">
          {SCALES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => changeScale(s.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: scale === s.key }}
              style={({ pressed }) => [styles.scale, scale === s.key && styles.scaleOn, pressed && scale !== s.key && styles.scalePressed]}
            >
              <Text style={[styles.scaleText, scale === s.key && styles.scaleTextOn]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {timelineOn ? null : scale === 'local' ? (
          <LocalPanel
            place={localName}
            interests={profile}
            recommendations={localRecommendations}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            status={localStatus}
            deviceNote={reusedAnswers ? 'Gemma non risponde da qui: interessi dalle risposte che aveva già dato sulle foto demo.' : whereGemmaRuns()}
            onRemoveInterest={(id) => setRemoved((r) => [...r, id])}
            bottomInset={insets.bottom}
          />
        ) : (
          selected && (
            <PlaceSheet
              place={selected}
              sources={visited[selected.level][selected.id] ?? []}
              photos={placePhotos}
              recommendations={placeRecommendations}
              onToggleManual={toggleSelected}
              onOpenPhoto={setOpened}
              onClose={() => setSelected(null)}
              bottomInset={insets.bottom}
            />
          )
        )}
      </View>

      {galleryOpen && (
        <PhotoGroup
          photos={photos}
          title="La tua galleria"
          notice={
            choice === 'all' ? (
              <Pressable onPress={skipGallery} style={styles.consentLink} accessibilityRole="button">
                <Text style={styles.consentLinkText}>Smetti di usare la galleria</Text>
              </Pressable>
            ) : (
              <View style={styles.consent}>
                <Text style={styles.consentTitle}>La galleria non è collegata</Text>
                <Text style={styles.consentText}>
                  Collegala per vedere qui le tue foto, segnare sulla mappa dove le hai scattate e ricevere eventi su misura.
                  Gemma le guarda sul tuo dispositivo, mai nel cloud.
                </Text>
                <Pressable onPress={allowGallery} style={({ pressed }) => [styles.consentButton, pressed && styles.pressed]} accessibilityRole="button">
                  <Text style={styles.consentButtonText}>Usa la mia galleria</Text>
                </Pressable>
              </View>
            )
          }
          onOpen={setOpened}
          onClose={() => setGalleryOpen(false)}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      )}

      {group && group.some((id) => byId.has(id)) && (
        <PhotoGroup
          photos={group.flatMap((id) => byId.get(id) ?? [])}
          onOpen={setOpened}
          onClose={() => setGroup(null)}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      )}

      {opened && byId.get(opened) && (
        <PhotoPreview photo={byId.get(opened)!} analysis={analyses[opened]} onClose={() => setOpened(null)} />
      )}

      {passportOpen && (
        <PassportSheet data={travel} onClose={() => setPassportOpen(false)} topInset={insets.top} bottomInset={insets.bottom} />
      )}

      {choice === null && (
        <Welcome onUseGallery={allowGallery} onSkip={skipGallery} topInset={insets.top} bottomInset={insets.bottom} />
      )}
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
        <Text style={styles.previewWhere}>{where}</Text>
        <Text style={styles.previewWhen}>{when}</Text>
        {analysis && (
          <View style={styles.previewAi}>
            <Text style={styles.previewAiLabel}>Gemma ha visto</Text>
            <Text style={styles.previewScene}>{analysis.scene}</Text>
            <View style={styles.previewTags}>
              {analysis.interests.map((i) => (
                <View key={i} style={styles.previewTag}>
                  <Text style={styles.previewTagText}>{labelOf(i)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
      <Text style={styles.previewHint}>Tocca per chiudere</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header: an instrument readout of what you've covered.
  // Header: one row of numbers across the whole width, on solid ink so nothing shows through.
  header: {
    position: 'absolute', left: 12, right: 12,
    backgroundColor: C.bg, borderRadius: R.md, borderWidth: 1, borderColor: C.line,
    paddingVertical: 10, paddingHorizontal: 4,
    boxShadow: '0 10px 30px rgba(2, 8, 12, 0.45)',
  },
  galleryTool: { flexDirection: 'row', alignItems: 'center', gap: 7, marginLeft: 'auto' },
  galleryDot: { width: 7, height: 7, borderRadius: 2, borderWidth: 1.5, borderColor: C.faint },
  galleryDotOn: { backgroundColor: C.accent, borderColor: C.accent },
  counts: { flexDirection: 'row', alignItems: 'stretch' },
  count: { flex: 1, paddingHorizontal: 10, justifyContent: 'center' },
  countRule: { borderLeftWidth: 1, borderLeftColor: C.line },
  levelCell: { flex: 1.7 },
  level: { color: C.accent, fontFamily: F.bold, fontSize: 15.5, lineHeight: 28, letterSpacing: -0.3 },
  countN: {
    color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 28, letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  countLabel: { color: C.muted, fontFamily: F.mono, fontSize: 11.5, marginTop: 2 },
  status: {
    color: C.accent, fontFamily: F.mono, fontSize: 11.5, lineHeight: 16,
    marginTop: 10, marginHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.line,
  },
  pressed: { opacity: 0.6 },

  toast: {
    position: 'absolute', alignSelf: 'center', maxWidth: '86%',
    backgroundColor: C.bg, borderRadius: R.sm, borderWidth: 1, borderColor: C.lineStrong,
    borderLeftWidth: 3, borderLeftColor: C.accent, paddingVertical: 10, paddingHorizontal: 14,
    boxShadow: '0 8px 24px rgba(2, 8, 12, 0.5)',
  },
  toastText: { color: C.text, fontFamily: F.medium, fontSize: 14 },

  // Scale switcher: a segmented dial; the active scale reads in paper white, orange stays for "visited".
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10 },
  scales: {
    marginHorizontal: 12, flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.md, padding: 3,
    borderWidth: 1, borderColor: C.line, boxShadow: '0 10px 30px rgba(2, 8, 12, 0.45)',
  },
  scale: { flex: 1, minHeight: 44, borderRadius: R.sm + 1, alignItems: 'center', justifyContent: 'center' },
  scaleOn: { backgroundColor: C.text },
  scalePressed: { backgroundColor: C.line },
  scaleText: { color: C.muted, fontFamily: F.medium, fontSize: 14, letterSpacing: -0.1 },
  scaleTextOn: { color: C.bg, fontFamily: F.bold },
  tools: { flexDirection: 'row', gap: 6, marginHorizontal: 12 },
  // The gallery screen: consent when the gallery is not connected, a way out when it is.
  consent: { width: '100%', margin: 2, marginBottom: 14, padding: 16, gap: 8, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  consentTitle: { color: C.text, fontFamily: F.bold, fontSize: 17, letterSpacing: -0.3 },
  consentText: { color: C.muted, fontFamily: F.body, fontSize: 14.5, lineHeight: 21 },
  consentButton: { marginTop: 6, minHeight: 48, borderRadius: R.md, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  consentButtonText: { color: C.onAccent, fontFamily: F.bold, fontSize: 16 },
  consentLink: { width: '100%', paddingHorizontal: 2, paddingBottom: 12 },
  consentLinkText: { color: C.muted, fontFamily: F.mono, fontSize: 12, textDecorationLine: 'underline' },
  timelineButton: { backgroundColor: C.surface, borderRadius: R.md,
    borderWidth: 1, borderColor: C.line, paddingVertical: 10, paddingHorizontal: 12,
  },
  timelineButtonText: { color: C.text, fontFamily: F.semi, fontSize: 13.5 },

  // Photo preview: the picture first, then where, when and what Gemma read in it.
  preview: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: '#05090b', justifyContent: 'center', paddingHorizontal: 20, gap: 20,
  },
  previewImage: { width: '100%', height: '56%', borderRadius: R.md },
  previewInfo: { gap: 2 },
  previewWhere: { color: C.text, fontFamily: F.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  previewWhen: { color: C.muted, fontFamily: F.mono, fontSize: 12.5 },
  previewAi: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line, gap: 6 },
  previewAiLabel: { color: C.accent, fontFamily: F.monoMedium, fontSize: 11.5 },
  previewScene: { color: C.text, fontFamily: F.body, fontSize: 16, lineHeight: 22 },
  previewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  previewTag: { borderRadius: R.sm, borderWidth: 1, borderColor: C.lineStrong, paddingVertical: 4, paddingHorizontal: 8 },
  previewTagText: { color: C.text, fontFamily: F.medium, fontSize: 13 },
  previewHint: { color: C.faint, fontFamily: F.mono, fontSize: 11, textAlign: 'center' },
});
