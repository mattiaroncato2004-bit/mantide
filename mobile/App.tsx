// Mantide: one screen, the map of where you've been. Zooming lights up countries, then regions, then
// provinces; one sheet at the bottom talks about the place in view: your photos there, and events for
// you chosen from what you photograph. State and composition only: the screens live in src/screens/.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { MapCanvas } from './src/map/MapCanvas';
import {
  areasInView, coversWithoutThumb, distanceRings, frameOf, journeyLine, levelForZoom, LOCAL_ZOOM, makePhotoIndex, placeAt, placeLevelForZoom, PROVINCE_ZOOM,
} from './src/map/model';
import type { Basemap } from './src/map/style';
import type { CameraTarget, MapView } from './src/map/types';
import { makeThumbs } from './src/map/thumbs';
import { locate, nameOf } from './src/geo/locate';
import { ids, useVisited } from './src/state/visited';
import { askForAllPhotos, forgetPhotos, loadPhotos, loadSample, requestGallery, scanGallery, type Photo } from './src/gallery/photos';
import {
  analyzePhoto, demoAnalysis, GEMMA_URL, loadAnalyses, sample, saveAnalyses, whereGemmaRuns, type Analysis,
} from './src/ai/gemma';
import { GemmaUnreachable } from './src/ai/call';
import type { InterestId } from './src/ai/interests';
import { SAMPLE_EVENTS as EVENTS, haversineKm, profileFromCounts, recommend, recommendIn, type Event } from './src/events/recommend';
import { Welcome } from './src/screens/Welcome';
import { MapButtons } from './src/screens/MapButtons';
import { WorldSummary } from './src/screens/WorldSummary';
import { AreaPhotos } from './src/screens/AreaPhotos';
import { PlaceHeader, PlaceSheet, type Suggestion } from './src/screens/PlaceSheet';
import { PassportSheet } from './src/screens/PassportSheet';
import { PhotoGroup } from './src/screens/PhotoGroup';
import { PhotoViewer } from './src/screens/PhotoViewer';
import { TimelineBar } from './src/screens/TimelineBar';
import { passport, placeStats } from './src/stats/passport';
import { Sheet } from './src/ui/Sheet';
import { detentHeights, type Detent } from './src/ui/detents';
import { distanceUnit, formatCount, formatDate, t } from './src/i18n';
import Storage from './src/storage';
import { C, F, R } from './src/theme';
import type { Level } from './src/types';

// San Francisco (Mission District): the demo traveler's home, and yours until the GPS answers.
const DEFAULT_HOME = { lat: 37.7599, lon: -122.4148 };
const WORLD_ZOOM = 1.4;
const HOME_ZOOM = 10;
const TIMELINE_ZOOM = 4;

// The timeline's play button moves one photo forward this often.
const PLAY_STEP_MS = 500;

// Whether the user let the app read the gallery, or chose the sample photos: asked once, at first launch.
type GalleryChoice = 'all' | 'none' | 'sample';
const CHOICE_KEY = 'gallery:choice';

type Area = { level: Level; id: string };

export default function App() {
  // Inter, the one typeface of src/theme.ts. On failure the app still starts, with system fonts.
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  // Safari on iPhone can wait up to expo-font's 12 s timeout, on a black screen: start anyway after
  // 1.5 s, and the fonts swap in when they arrive.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 1500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {fontsLoaded || fontError || waited ? <Home /> : <View style={styles.root} />}
    </SafeAreaProvider>
  );
}

function Home() {
  const insets = useSafeAreaInsets();
  const { height: screen } = useWindowDimensions();
  const [choice, setChoice] = useState<GalleryChoice | null | undefined>(undefined); // undefined: still loading
  // The web demo is a fixed traveler in San Francisco: the browser never asks for the visitor's location.
  const [home, setHome] = useState(DEFAULT_HOME);
  const [located, setLocated] = useState(Platform.OS === 'web');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null); // reading the gallery, Gemma at work
  const [gemmaDown, setGemmaDown] = useState(false); // Gemma unreachable and no earlier answers to use
  const [reusedAnswers, setReusedAnswers] = useState(0); // demo photos labelled with Gemma's earlier answers
  const [removed, setRemoved] = useState<InterestId[]>([]);
  const [opened, setOpened] = useState<string | null>(null); // photo shown full screen
  const [group, setGroup] = useState<{ ids: string[]; title?: string } | null>(null); // a grid of photos
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null); // event dot or card tapped
  const [passportOpen, setPassportOpen] = useState(false);
  const [timelineOn, setTimelineOn] = useState(false);
  const [timelineIndex, setTimelineIndex] = useState(0); // photo reached on the timeline, oldest first
  const [playing, setPlaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resumed = useRef(false);
  const { visited, toggleManual, mark, forget } = useVisited();

  // The map: what it shows, where the camera goes, the sheet over it.
  const [view, setView] = useState<MapView>({ zoom: WORLD_ZOOM, bounds: [-180, -85, 180, 85], center: [DEFAULT_HOME.lon, DEFAULT_HOME.lat], user: false });
  const [camera, setCamera] = useState<CameraTarget>({ key: 0, center: [DEFAULT_HOME.lon, DEFAULT_HOME.lat], zoom: WORLD_ZOOM });
  const flyTo = useCallback((center: [number, number], zoom: number) => setCamera((c) => ({ key: c.key + 1, center, zoom })), []);
  const [basemap, setBasemap] = useState<Basemap>('standard');
  const [detent, setDetent] = useState<Detent>('low');
  const [tapped, setTapped] = useState<Area | null>(null); // the area tapped, until you move the map

  // The current position marks the area you are in and is where "Back to me" goes.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') return;
      const place = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
        setHome({ lat: latitude, lon: longitude });
        setLocated(true);
        mark('gps', [locate(latitude, longitude)]);
      };
      // The last known position answers at once; a fresh fix can take long indoors, or never come on
      // an emulator.
      const last = await Location.getLastKnownPositionAsync();
      if (last) place(last.coords);
      place((await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })).coords);
    })().catch((e) => console.warn('[gps]', e));
  }, [mark]);

  useEffect(() => {
    Promise.all([Storage.getItem(CHOICE_KEY), loadPhotos(), loadAnalyses()])
      .then(([saved, savedPhotos, savedAnalyses]) => {
        setPhotos(savedPhotos);
        setAnalyses(savedAnalyses);
        setChoice(saved === 'all' || saved === 'none' || saved === 'sample' ? saved : null);
      })
      .catch((e) => {
        console.warn('[start] load failed', e);
        setChoice(null);
      });
  }, []);

  // Gemma looks at a sample of the photos (at most 3 per place and day) and labels each one.
  const analyze = useCallback(async (list: Photo[], prior: Record<string, Analysis>) => {
    const todo = sample(list).filter((p) => !prior[p.id]);
    if (!todo.length) {
      setProgress(null);
      return;
    }
    const results = { ...prior };
    try {
      for (const [i, photo] of todo.entries()) {
        setProgress(t('status.analyzing', { n: formatCount(i + 1), total: formatCount(todo.length) }));
        try {
          results[photo.id] = await analyzePhoto(photo.uri);
          setAnalyses({ ...results });
          await saveAnalyses(results);
        } catch (e) {
          if (e instanceof GemmaUnreachable) throw e; // no answer at all: switch to the prepared answers
          console.warn('[gemma] photo skipped', photo.id, e);
        }
      }
      setProgress(null);
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
      // Said quietly where the suggestions are, never over the map.
      setReusedAnswers(reused);
      setGemmaDown(!reused);
      setProgress(null);
    }
  }, []);

  // Reads the gallery, marks the places it shows, then lets Gemma find your interests.
  const readGallery = useCallback(async () => {
    setBusy(true);
    try {
      const access = await requestGallery();
      if (access === 'denied') {
        setProgress(t('status.denied'));
        return;
      }
      if (access === 'limited') {
        setProgress(t('status.limited'));
        await askForAllPhotos();
      }
      const found = await scanGallery((read, withGps) => setProgress(t('status.reading', { read, withGps })));
      setPhotos(found);
      mark('photo', found);
      await analyze(found, await loadAnalyses());
    } catch (e) {
      console.warn('[photos] scan failed', e);
      setProgress(t('status.readFailed', { error: String(e) }));
    } finally {
      setBusy(false);
    }
  }, [mark, analyze]);

  // On later launches, finish whatever Gemma had not looked at yet; if the saved photos were
  // dropped (a new data version), read the gallery again.
  useEffect(() => {
    if (resumed.current || (choice !== 'all' && choice !== 'sample')) return;
    resumed.current = true;
    if (choice === 'sample') {
      if (!photos.length) loadSampleGallery();
      return;
    }
    if (!photos.length) {
      readGallery();
      return;
    }
    setBusy(true);
    analyze(photos, analyses).finally(() => setBusy(false));
  }, [choice, photos, analyses, analyze, readGallery]);

  // Drops the photos in use (gallery or samples) and the places they marked.
  const dropPhotos = () => {
    setPhotos([]);
    setThumbs({});
    thumbsTried.current.clear();
    setAnalyses({});
    forgetPhotos();
    saveAnalyses({});
    forget('photo');
    setProgress(null);
    setReusedAnswers(0);
    setGemmaDown(false);
  };

  const allowGallery = () => {
    if (choice === 'sample') dropPhotos();
    setChoice('all');
    Storage.setItem(CHOICE_KEY, 'all');
    resumed.current = true; // readGallery runs Gemma itself
    readGallery();
  };

  const skipGallery = () => {
    setChoice('none');
    Storage.setItem(CHOICE_KEY, 'none');
    dropPhotos();
  };

  // The sample photos, with the answers Gemma gave on them beforehand: no gallery, no Gemma needed.
  const loadSampleGallery = useCallback(async () => {
    const found = await loadSample();
    const answers = Object.fromEntries(found.flatMap((p) => {
      const a = demoAnalysis(p.filename);
      return a ? [[p.id, a] as const] : [];
    }));
    setPhotos(found);
    mark('photo', found);
    setAnalyses(answers);
    await saveAnalyses(answers);
  }, [mark]);

  const trySample = () => {
    setChoice('sample');
    Storage.setItem(CHOICE_KEY, 'sample');
    resumed.current = true;
    loadSampleGallery().catch((e) => console.warn('[sample]', e));
  };

  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);
  const visitedIds = useMemo(
    () => ({ country: ids(visited, 'country'), region: ids(visited, 'region'), province: ids(visited, 'province') }),
    [visited],
  );
  const travel = useMemo(() => passport(visitedIds, locate(home.lat, home.lon).country ?? ''), [visitedIds, home]);

  // Your interests: how many analysed photos show each one, minus the ones you removed.
  const profile = useMemo(() => {
    const counts: Partial<Record<InterestId, number>> = {};
    for (const [id, a] of Object.entries(analyses)) {
      if (!byId.has(id)) continue;
      for (const i of a.interests) if (!removed.includes(i)) counts[i] = (counts[i] ?? 0) + 1;
    }
    return profileFromCounts(counts);
  }, [analyses, byId, removed]);

  // The place in view, which the sheet talks about: the area you tapped, or the one around the
  // middle of the map at this zoom (null far out: the whole world).
  const placeLevel = placeLevelForZoom(view.zoom);
  const place: Area | null = tapped ?? (placeLevel ? placeAt(view.center[0], view.center[1], placeLevel) : null);
  const placeKey = place ? `${place.level}:${place.id}` : 'world';
  // Up close, "For you here" is what's around the middle of the map.
  const localAt = !tapped && place?.level === 'province' && view.zoom >= LOCAL_ZOOM ? view.center : null;

  const recommendations = useMemo(() => {
    if (!place) return recommend(EVENTS, profile, 'global', { country: '', region: '', ...home });
    if (localAt) {
      const [lon, lat] = localAt;
      const here = locate(lat, lon);
      return recommend(EVENTS, profile, 'local', { country: here.country ?? '', region: here.region ?? '', lat, lon });
    }
    const inPlace = (e: Event) => locate(e.lat, e.lon)[place.level] === place.id;
    return recommendIn(EVENTS, profile, inPlace, home);
    // place is read through placeKey; localAt through its coordinates.
  }, [placeKey, localAt?.[0], localAt?.[1], profile, home]);

  // The event you picked comes first.
  const ordered = useMemo(
    () => (selectedEvent ? [...recommendations].sort((a, b) => Number(b.event.id === selectedEvent) - Number(a.event.id === selectedEvent)) : recommendations),
    [recommendations, selectedEvent],
  );

  // Each suggestion shows one of your photos that explains it: of its main interest, nearest to it.
  const suggestions: Suggestion[] = useMemo(
    () =>
      ordered.slice(0, 4).map((rec, i) => {
        const interest = rec.matched[0]?.id;
        const fitting = photos.filter((p) => interest && analyses[p.id]?.interests.includes(interest));
        const pool = fitting.length ? fitting : photos;
        const cover = pool.reduce<Photo | undefined>(
          (best, p) => (!best || haversineKm(p.lat, p.lon, rec.event.lat, rec.event.lon) < haversineKm(best.lat, best.lon, rec.event.lat, rec.event.lon) ? p : best),
          undefined,
        );
        const image = cover && (i === 0 ? cover.uri : (thumbs[cover.id] ?? cover.uri));
        return { rec, image, km: haversineKm(home.lat, home.lon, rec.event.lat, rec.event.lon) };
      }),
    [ordered, photos, analyses, thumbs, home],
  );

  const newestFirst = (list: Photo[]) => [...list].sort((a, b) => b.takenAt - a.takenAt);
  const placePhotos = useMemo(() => newestFirst(place ? photos.filter((p) => p[place.level] === place.id) : photos), [placeKey, photos]);
  const stats = useMemo(() => place && placeStats(photos, visitedIds, place.level, place.id), [placeKey, photos, visitedIds]);

  // The photos on the part of the map in view (a view across the antimeridian wraps around).
  const viewPhotos = useMemo(() => {
    const [w, s, e, n] = view.bounds;
    return newestFirst(photos.filter((p) => p.lat >= s && p.lat <= n && (w <= e ? p.lon >= w && p.lon <= e : p.lon >= w || p.lon <= e)));
  }, [photos, view.bounds]);

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

  // The camera follows the journey.
  useEffect(() => {
    if (reached) flyTo([reached.lon, reached.lat], TIMELINE_ZOOM);
  }, [reached?.id, flyTo]);

  // Marks for the timeline: one per photo; a trip (more than 4 days since the previous photo)
  // starts with "Nov '26", left out where it would overlap the previous label.
  const timelineMarks = useMemo(() => {
    const last = Math.max(1, journey.length - 1);
    let lastLabelAt = -1;
    return journey.map((p, i) => {
      const at = i / last;
      const tripStart = i === 0 || p.takenAt - journey[i - 1].takenAt > 4 * 24 * 3600 * 1000;
      if (!tripStart || at - lastLabelAt < 0.14) return { at };
      lastLabelAt = at;
      const d = new Date(p.takenAt);
      return { at, label: `${formatDate(p.takenAt, 'month')} '${String(d.getFullYear()).slice(2)}` };
    });
  }, [journey]);

  const openTimeline = () => {
    setTapped(null);
    setTimelineIndex(0);
    setTimelineOn(true);
    setPlaying(true);
  };

  const closeTimeline = () => {
    setPlaying(false);
    setTimelineOn(false);
  };

  // What the map draws.
  // Every photo is indexed (10,000 group in under a frame); at most 60 pins are drawn.
  const shownPhotos = useMemo(
    () => (timelineOn && reached ? photos.filter((p) => p.takenAt <= reached.takenAt) : photos),
    [photos, timelineOn, reached],
  );
  const photoIndex = useMemo(() => makePhotoIndex(shownPhotos), [shownPhotos]);
  const areas = useMemo(() => areasInView(levelForZoom(view.zoom), view.bounds, visitedIds), [view.zoom, view.bounds, visitedIds]);
  const clusters = useMemo(() => photoIndex.clusters(view.bounds, view.zoom), [photoIndex, view.bounds, view.zoom]);

  // Small thumbnails, made only for the pins on screen and cached on the device; the grids fall
  // back to the photo itself until a thumbnail exists.
  const thumbsTried = useRef(new Set<string>()); // asked once each: an unreadable photo isn't retried
  useEffect(() => {
    const missing = coversWithoutThumb(clusters, thumbs)
      .filter((id) => !thumbsTried.current.has(id))
      .flatMap((id) => byId.get(id) ?? []);
    if (!missing.length) return;
    missing.forEach((p) => thumbsTried.current.add(p.id));
    makeThumbs(missing)
      .then((made) => Object.keys(made).length && setThumbs((t) => ({ ...t, ...made })))
      .catch((e) => console.warn('[thumbs]', e));
  }, [clusters, thumbs, byId]);
  const eventDots = place && !timelineOn ? ordered.map((r) => ({ id: r.event.id, lon: r.event.lon, lat: r.event.lat, selected: r.event.id === selectedEvent })) : [];
  // Rings around you when the suggestions are the ones around you.
  const ringsShown = !!localAt && !timelineOn && haversineKm(home.lat, home.lon, localAt[1], localAt[0]) < 30;
  const farthestKm = Math.max(0, ...recommendations.map((r) => haversineKm(home.lat, home.lon, r.event.lat, r.event.lon)));
  const heights = detentHeights(screen, insets.bottom);

  const showToast = (text: string) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  const toggleMark = () => {
    if (!place) return;
    const hadManual = visited[place.level][place.id]?.includes('manual');
    toggleManual(place.level, place.id);
    showToast(t(hadManual ? 'toast.unmarked' : 'toast.marked', { name: nameOf(place.level, place.id) }));
  };

  // Tapping an area flies one step into it (Lazio among Italy's regions shows Lazio's provinces) and
  // opens its sheet.
  const onAreaPress = (level: Level, id: string) => {
    const frame = frameOf(level, id);
    if (!frame) return;
    setTapped({ level, id });
    setSelectedEvent(null);
    flyTo(frame.center, frame.zoom);
    setDetent('high');
  };

  // A suggestion tapped in the sheet: the sheet goes down and the map shows where it is.
  const showEvent = (id: string) => {
    const event = recommendations.find((r) => r.event.id === id)?.event;
    setSelectedEvent(id);
    if (!event) return;
    setDetent('low');
    flyTo([event.lon, event.lat], Math.max(view.zoom, 11));
  };

  const backToMe = () => {
    setTapped(null);
    setSelectedEvent(null);
    flyTo([home.lon, home.lat], HOME_ZOOM);
  };

  // Android's back: the photo, then the grid, the passport, the timeline, the sheet one step lower,
  // and only then out of the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (opened) setOpened(null);
      else if (group) setGroup(null);
      else if (passportOpen) setPassportOpen(false);
      else if (timelineOn) closeTimeline();
      else if (detent !== 'low') setDetent(detent === 'high' ? 'mid' : 'low');
      else return false;
      return true;
    });
    return () => sub.remove();
  }, [opened, group, passportOpen, timelineOn, detent]);

  const header = place ? (
    <PlaceHeader name={nameOf(place.level, place.id)} level={place.level} id={place.id} stats={stats!} status={progress} />
  ) : (
    <WorldSummary
      travel={travel}
      status={progress}
      onOpenPassport={() => setPassportOpen(true)}
      onTimeline={journey.length > 1 ? openTimeline : undefined}
    />
  );

  const emptyText = choice === 'none' ? t('place.connectGallery') : busy ? t('place.waiting') : t('place.noEvents');
  const note = choice === 'sample'
    ? t('place.sampleGallery')
    : reusedAnswers ? t('place.fallbackNote') : gemmaDown ? t('status.noGemma', { url: GEMMA_URL }) : null;
  const thumb = (p: Photo) => ({ id: p.id, uri: thumbs[p.id] ?? p.uri });

  return (
    <View style={styles.root}>
      <MapCanvas
        basemap={basemap}
        areas={areas}
        clusters={clusters}
        thumbs={thumbs}
        journey={timelineOn && reached ? journeyLine(photos, reached.takenAt) : null}
        events={eventDots}
        you={located && view.zoom >= PROVINCE_ZOOM ? { lon: home.lon, lat: home.lat, label: t('map.youAreHere') } : null}
        rings={ringsShown ? distanceRings([home.lon, home.lat], farthestKm, distanceUnit) : []}
        camera={camera}
        sheetHeight={Math.min(heights[detent], heights.mid)}
        onViewChange={(v) => {
          setView(v);
          if (v.user) setTapped(null);
        }}
        onAreaPress={onAreaPress}
        onClusterPress={(key) => setGroup({ ids: photoIndex.leaves(key) })}
        onPhotoPress={setOpened}
        onEventPress={(id) => {
          setSelectedEvent(id);
          setDetent('high');
        }}
      />

      {/* Hidden while the sheet covers the map, as in Apple Maps. */}
      {detent !== 'high' && <MapButtons
        top={insets.top + 8}
        basemap={basemap}
        onToggleBasemap={() => setBasemap((b) => (b === 'satellite' ? 'standard' : 'satellite'))}
        onBackToMe={backToMe}
      />}

      {toast && (
        <View style={[styles.toast, { top: insets.top + 8 }]} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

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
          bottomInset={insets.bottom}
        />
      ) : (
        <Sheet detent={detent} onDetentChange={setDetent} header={header} bottomInset={insets.bottom}>
          {detent === 'high' ? (
            <PlaceSheet
              suggestions={suggestions}
              selectedEvent={selectedEvent}
              onSelectEvent={showEvent}
              empty={emptyText}
              note={note}
              photos={placePhotos.map(thumb)}
              onOpenPhoto={setOpened}
              onSeeAll={() => setGroup({ ids: placePhotos.map((p) => p.id), title: place ? nameOf(place.level, place.id) : t('world.title') })}
              mark={place ? { manual: !!visited[place.level][place.id]?.includes('manual'), onToggle: toggleMark } : undefined}
            />
          ) : (
            <AreaPhotos
              photos={viewPhotos.map(thumb)}
              onOpen={setOpened}
              onSeeAll={() => setGroup({ ids: viewPhotos.map((p) => p.id) })}
              consent={choice === 'none' ? { text: `${t('gallery.offText')} ${whereGemmaRuns()}`, onAllow: allowGallery } : undefined}
            />
          )}
        </Sheet>
      )}

      {group && group.ids.some((id) => byId.has(id)) && (
        <PhotoGroup
          photos={group.ids.flatMap((id) => byId.get(id) ?? [])}
          thumbs={thumbs}
          title={group.title}
          onOpen={setOpened}
          onClose={() => setGroup(null)}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      )}

      {opened && byId.get(opened) && (
        <PhotoViewer
          photo={byId.get(opened)!}
          analysis={analyses[opened]}
          onClose={() => setOpened(null)}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      )}

      {passportOpen && (
        <PassportSheet
          data={travel}
          interests={profile}
          onRemoveInterest={(id) => setRemoved((r) => [...r, id])}
          onStopGallery={choice === 'all' ? skipGallery : undefined}
          onUseGallery={choice === 'sample' ? allowGallery : undefined}
          onClose={() => setPassportOpen(false)}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      )}

      {choice === null && (
        <Welcome onUseGallery={allowGallery} onTrySample={trySample} onSkip={skipGallery} topInset={insets.top} bottomInset={insets.bottom} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  toast: {
    position: 'absolute', alignSelf: 'center', maxWidth: '70%',
    backgroundColor: C.material, borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.materialLine,
    paddingVertical: 10, paddingHorizontal: 14, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  toastText: { color: C.text, fontFamily: F.medium, fontSize: 14 },
});
