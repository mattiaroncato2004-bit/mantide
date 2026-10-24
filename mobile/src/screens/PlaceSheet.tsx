// The sheet that opens from the bottom when you tap an area on the map: how it became visited,
// the photos taken there, events for you there, and the button to mark it by hand.
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { why, type Recommendation } from '../events/recommend';
import type { Photo } from '../gallery/photos';
import { C } from '../theme';
import type { Level, Source } from '../types';

export type SelectedPlace = { level: Level; id: string; name: string };

const LEVEL_LABEL: Record<Level, string> = { country: 'Paese', region: 'Regione', province: 'Provincia', hex: 'Zona' };

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

function sourcesText(sources: Source[], photoCount: number): string {
  if (!sources.length) return 'Non ancora visitato';
  const parts = sources.map((s) =>
    s === 'manual' ? 'segnato a mano' : s === 'gps' ? 'eri qui col GPS' : `${photoCount} ${photoCount === 1 ? 'foto' : 'foto'}`,
  );
  return `Visitato · ${parts.join(' · ')}`;
}

const date = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

export function PlaceSheet({ place, sources, photos, recommendations, onToggleManual, onOpenPhoto, onClose, bottomInset }: Props) {
  const manual = sources.includes('manual');
  return (
    <View style={[styles.sheet, { paddingBottom: bottomInset + 16 }]}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.kicker}>{LEVEL_LABEL[place.level]}</Text>
          <Text style={styles.title}>{place.name}</Text>
          <Text style={styles.sources}>{sourcesText(sources, photos.length)}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Chiudi">
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {photos.slice(0, 12).map((p) => (
            <Pressable key={p.id} onPress={() => onOpenPhoto(p.id)} accessibilityRole="imagebutton">
              <Image source={{ uri: p.uri }} style={styles.photo} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {recommendations.slice(0, 2).map((r) => (
        <View key={r.event.id} style={styles.event}>
          <Text style={styles.eventMeta}>{date(r.event.start)} · {r.event.city}</Text>
          <Text style={styles.eventTitle}>{r.event.title}</Text>
          <Text style={styles.why}>{why(r)}</Text>
        </View>
      ))}

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
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: C.line, paddingTop: 16, paddingHorizontal: 16, gap: 12,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headText: { flex: 1, gap: 2 },
  kicker: { color: C.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { color: C.text, fontSize: 22, fontWeight: '700' },
  sources: { color: C.muted, fontSize: 14 },
  close: { color: C.muted, fontSize: 18, padding: 4 },
  photos: { gap: 6 },
  photo: { width: 72, height: 72, borderRadius: 8, backgroundColor: C.line },
  event: { backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.line, gap: 3 },
  eventMeta: { color: C.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  eventTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  why: { color: C.accent, fontSize: 13, fontWeight: '600' },
  button: { backgroundColor: C.accent, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  buttonOff: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.line },
  pressed: { opacity: 0.7 },
  buttonText: { color: C.onAccent, fontWeight: '700', fontSize: 15 },
  buttonTextOff: { color: C.text },
});
