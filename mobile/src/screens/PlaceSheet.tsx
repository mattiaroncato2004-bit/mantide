// The sheet that opens from the bottom when you tap an area on the map: how it became visited,
// the photos taken there, events for you there, and the button to mark it by hand.
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { why, type Recommendation } from '../events/recommend';
import type { Photo } from '../gallery/photos';
import { C, F, R, S } from '../theme';
import type { Level, Source } from '../types';

export type SelectedPlace = { level: Level; id: string; name: string };

const LEVEL_LABEL: Record<Level, string> = { country: 'Paese', region: 'Regione', province: 'Provincia' };

type Props = {
  place: SelectedPlace;
  sources: Source[];
  photos: Photo[];
  recommendations: Recommendation[];
  onToggleManual: () => void;
  onOpenPhoto: (id: string) => void;
  onClose: () => void;
  bottomInset: number;
};

function sourceTag(s: Source, photoCount: number): string {
  return s === 'manual' ? 'segnato a mano' : s === 'gps' ? 'eri qui col GPS' : `${photoCount} foto`;
}

function sourcesText(sources: Source[], photoCount: number): string {
  if (!sources.length) return 'Non ancora visitato';
  return `Visitato: ${sources.map((s) => sourceTag(s, photoCount)).join(', ')}`;
}

const day = (iso: string) => String(new Date(iso).getDate());
const month = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');

export function PlaceSheet({ place, sources, photos, recommendations, onToggleManual, onOpenPhoto, onClose, bottomInset }: Props) {
  const manual = sources.includes('manual');
  const visited = sources.length > 0;
  return (
    <View style={[styles.sheet, { paddingBottom: bottomInset + 16 }]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.level}>{LEVEL_LABEL[place.level]}</Text>
          <Text style={styles.title} numberOfLines={2}>{place.name}</Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Chiudi"
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.sources} accessible accessibilityLabel={sourcesText(sources, photos.length)}>
        <View style={[styles.mark, visited && styles.markOn]} />
        <Text style={[styles.state, !visited && styles.stateOff]}>{visited ? 'Visitato' : 'Non ancora visitato'}</Text>
        {sources.map((s) => (
          <View key={s} style={styles.tag}>
            <Text style={styles.tagText}>{sourceTag(s, photos.length)}</Text>
          </View>
        ))}
      </View>

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos} style={styles.photoStrip}>
          {photos.slice(0, 12).map((p) => (
            <Pressable key={p.id} onPress={() => onOpenPhoto(p.id)} accessibilityRole="imagebutton" style={({ pressed }) => pressed && styles.pressed}>
              <Image source={{ uri: p.uri }} style={styles.photo} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {recommendations.length > 0 && (
        <View style={styles.events}>
          <Text style={styles.sectionLabel}>Eventi per te</Text>
          {recommendations.slice(0, 2).map((r) => (
            <View key={r.event.id} style={styles.event}>
              <View style={styles.date}>
                <Text style={styles.day}>{day(r.event.start)}</Text>
                <Text style={styles.month}>{month(r.event.start)}</Text>
              </View>
              <View style={styles.eventBody}>
                <Text style={styles.eventTitle} numberOfLines={2}>{r.event.title}</Text>
                <Text style={styles.eventCity}>{r.event.city}</Text>
                <Text style={styles.why} numberOfLines={2}>{why(r)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={onToggleManual}
        style={({ pressed }) => [styles.button, manual && styles.buttonOff, pressed && styles.pressed]}
        accessibilityRole="button"
      >
        <Text style={[styles.buttonText, manual && styles.buttonTextOff]}>
          {manual ? 'Togli il segno a mano' : 'Segna come visitato'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg,
    borderTopWidth: 1, borderColor: C.line, paddingTop: 14, paddingHorizontal: S.lg, gap: S.md,
    boxShadow: '0 -12px 32px rgba(2, 8, 12, 0.45)',
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md },
  headText: { flex: 1 },
  level: { color: C.muted, fontFamily: F.monoMedium, fontSize: 12 },
  title: { color: C.text, fontFamily: F.display, fontSize: 32, lineHeight: 35, letterSpacing: -1.1 },
  close: {
    width: 44, height: 44, borderRadius: R.sm, borderWidth: 1, borderColor: C.line,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: C.muted, fontSize: 14 },
  pressed: { opacity: 0.6 },
  sources: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: S.sm, marginTop: -4 },
  mark: { width: 9, height: 9, borderRadius: 2, borderWidth: 1.5, borderColor: C.faint, transform: [{ rotate: '45deg' }] },
  markOn: { backgroundColor: C.accent, borderColor: C.accent },
  state: { color: C.text, fontFamily: F.semi, fontSize: 15 },
  stateOff: { color: C.muted },
  tag: { borderRadius: R.sm, borderWidth: 1, borderColor: C.lineStrong, paddingVertical: 3, paddingHorizontal: 7 },
  tagText: { color: C.muted, fontFamily: F.mono, fontSize: 11.5 },
  photoStrip: { marginHorizontal: -S.lg },
  photos: { gap: 6, paddingHorizontal: S.lg },
  photo: { width: 76, height: 76, borderRadius: R.sm, backgroundColor: C.card },
  events: { gap: 0 },
  sectionLabel: { color: C.muted, fontFamily: F.medium, fontSize: 13.5, marginBottom: 4 },
  event: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  date: { width: 44, marginRight: 10 },
  day: { color: C.text, fontFamily: F.display, fontSize: 22, lineHeight: 24, letterSpacing: -0.5 },
  month: { color: C.muted, fontFamily: F.monoMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  eventBody: { flex: 1, gap: 2 },
  eventTitle: { color: C.text, fontFamily: F.bold, fontSize: 15.5, lineHeight: 19, letterSpacing: -0.2 },
  eventCity: { color: C.muted, fontFamily: F.mono, fontSize: 11.5 },
  why: { color: C.accent, fontFamily: F.medium, fontSize: 13.5, lineHeight: 18 },
  button: { backgroundColor: C.accent, borderRadius: R.md, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  buttonOff: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.lineStrong },
  buttonText: { color: C.onAccent, fontFamily: F.bold, fontSize: 16.5, letterSpacing: -0.2 },
  buttonTextOff: { color: C.text },
});
