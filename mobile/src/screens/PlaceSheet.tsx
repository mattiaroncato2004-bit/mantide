// The place you're looking at, as approved (place sheet v2): its name with three small numbers, then
// "For you here" as the main part (the first suggestion large, with a photo of yours that explains it),
// then your photos there, last.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { why, type Recommendation } from '../events/recommend';
import { formatDate, t, tc } from '../i18n';
import type { Count } from '../stats/passport';
import { C, F, R } from '../theme';
import type { Level } from '../types';
import { photoSource } from '../ui/photoSource';

const FILL = 'rgba(255, 255, 255, 0.07)';
const CHILD_UNIT = { country: 'unit.region', region: 'unit.province', province: 'unit.province' } as const;

// The sheet's header on a place, at every height: the name and the small numbers.
export function PlaceHeader({ name, level, stats, status }: {
  name: string;
  level: Level;
  stats: { photos: number; children?: Count; trips: number };
  status: string | null;
}) {
  const pills: [string, string][] = [];
  if (stats.photos) pills.push([String(stats.photos), tc('unit.photo', stats.photos)]);
  if (stats.children) pills.push([`${stats.children.visited}/${stats.children.total}`, tc(CHILD_UNIT[level], stats.children.total)]);
  if (stats.trips) pills.push([String(stats.trips), tc('unit.trip', stats.trips)]);
  return (
    <View style={styles.head}>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{name}</Text>
      {status ? (
        <Text style={styles.status} numberOfLines={1}>{status}</Text>
      ) : (
        <View style={styles.pills}>
          {pills.map(([n, unit]) => (
            <Text key={unit} style={styles.pill}>
              <Text style={styles.pillN}>{n}</Text> {unit}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

export type Suggestion = { rec: Recommendation; image?: string; km: number };

type Props = {
  suggestions: Suggestion[];
  selectedEvent: string | null;
  onSelectEvent(id: string): void;
  empty: string; // why there are no suggestions
  note: string | null; // Gemma answered from its earlier answers, or isn't reachable
  photos: { id: string; uri: string }[];
  onOpenPhoto(id: string): void;
  onSeeAll(): void;
  mark?: { manual: boolean; onToggle(): void }; // absent for the whole world
};

const when = (r: Recommendation) => formatDate(Date.parse(r.event.start), 'day-month');

export function PlaceSheet({ suggestions, selectedEvent, onSelectEvent, empty, note, photos, onOpenPhoto, onSeeAll, mark }: Props) {
  const [first, ...others] = suggestions;
  return (
    <View style={styles.body}>
      <Text style={styles.section} accessibilityRole="header">{t('place.forYou')}</Text>
      {first ? (
        <>
          <Pressable
            onPress={() => onSelectEvent(first.rec.event.id)}
            style={({ pressed }) => [styles.card, first.rec.event.id === selectedEvent && styles.cardOn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('place.showOnMap', { title: first.rec.event.title })}
            testID="suggestion"
          >
            {first.image ? (
              <View>
                <Image source={photoSource(first.image)} style={styles.cover} />
                <Text style={styles.badge}>{when(first.rec)} · {Math.round(first.km)} km</Text>
              </View>
            ) : null}
            <View style={styles.cardBody}>
              {first.image ? null : <Text style={styles.meta}>{when(first.rec)} · {Math.round(first.km)} km</Text>}
              <Text style={styles.cardTitle} numberOfLines={2}>{first.rec.event.title}</Text>
              <Text style={styles.why} numberOfLines={2}>{why(first.rec)}</Text>
            </View>
          </Pressable>
          {others.map(({ rec, image }) => (
            <Pressable
              key={rec.event.id}
              onPress={() => onSelectEvent(rec.event.id)}
              style={({ pressed }) => [styles.row, rec.event.id === selectedEvent && styles.cardOn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t('place.showOnMap', { title: rec.event.title })}
              testID="suggestion"
            >
              {image ? <Image source={photoSource(image)} style={styles.thumb} /> : <View style={styles.thumb} />}
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>{rec.event.title}</Text>
                <Text style={styles.rowWhy} numberOfLines={1}>{when(rec)} · {why(rec)}</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : (
        <Text style={styles.empty}>{empty}</Text>
      )}
      <Text style={styles.note}>{note ? `${note} ${t('place.sampleNote')}` : t('place.sampleNote')}</Text>

      {photos.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <Text style={styles.section} accessibilityRole="header">{t('place.photos')}</Text>
            <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>{t('place.seeAll')}</Text>
            </Pressable>
          </View>
          <View style={styles.grid}>
            {photos.slice(0, 8).map((p) => (
              <Pressable key={p.id} onPress={() => onOpenPhoto(p.id)} style={styles.cell} accessibilityRole="imagebutton">
                <Image source={photoSource(p.uri)} style={styles.cellImage} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      {mark && (
        <Pressable onPress={mark.onToggle} style={({ pressed }) => [styles.mark, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.markText}>{mark.manual ? t('place.unmark') : t('place.mark')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 16, gap: 8 },
  title: { color: C.text, fontFamily: F.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.5 },
  pills: { flexDirection: 'row', gap: 6, minHeight: 20 },
  pill: {
    color: C.muted, fontFamily: F.medium, fontSize: 11.5, backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 7, paddingVertical: 3, paddingHorizontal: 7, overflow: 'hidden',
  },
  pillN: { color: C.text, fontFamily: F.bold, fontVariant: ['tabular-nums'] },
  status: { color: C.accent, fontFamily: F.medium, fontSize: 12.5, minHeight: 20 },

  body: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  section: { color: C.text, fontFamily: F.bold, fontSize: 18, letterSpacing: -0.3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 },
  link: { color: C.accent, fontFamily: F.medium, fontSize: 14 },
  pressed: { opacity: 0.7 },
  card: { borderRadius: 13, overflow: 'hidden', backgroundColor: FILL, borderWidth: 1, borderColor: 'transparent' },
  cardOn: { borderColor: C.accent },
  cover: { height: 132, backgroundColor: FILL },
  badge: {
    position: 'absolute', left: 10, top: 10, color: C.text, fontFamily: F.bold, fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', borderRadius: 7, paddingVertical: 3, paddingHorizontal: 7, overflow: 'hidden',
  },
  cardBody: { padding: 12, paddingTop: 10, gap: 3 },
  meta: { color: C.muted, fontFamily: F.semi, fontSize: 12 },
  cardTitle: { color: C.text, fontFamily: F.bold, fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },
  why: { color: C.accent, fontFamily: F.medium, fontSize: 13.5, lineHeight: 18 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 13,
    backgroundColor: FILL, borderWidth: 1, borderColor: 'transparent',
  },
  thumb: { width: 46, height: 46, borderRadius: 8, backgroundColor: FILL },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: C.text, fontFamily: F.bold, fontSize: 14.5, letterSpacing: -0.2 },
  rowWhy: { color: C.accent, fontFamily: F.medium, fontSize: 12.5 },
  empty: { color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 21 },
  note: { color: C.faint, fontFamily: F.body, fontSize: 11.5, lineHeight: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -1.5 },
  cell: { width: '25%', aspectRatio: 1, padding: 1.5 },
  cellImage: { flex: 1, borderRadius: 5, backgroundColor: FILL },
  mark: {
    marginTop: 18, minHeight: 44, borderRadius: R.md, borderWidth: 1, borderColor: C.lineStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  markText: { color: C.text, fontFamily: F.semi, fontSize: 15 },
});
