// The local scale's panel: events around you chosen from your interests, with the interests
// Gemma found in your photos. Tapping an event dot on the map brings its card first; tapping a
// card shows the event on the map.
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { labelOf, type InterestId } from '../ai/interests';
import { why, type InterestWeight, type Recommendation } from '../events/recommend';
import { C, F, R, S } from '../theme';

type Props = {
  place: string; // "Treviso"
  interests: InterestWeight[];
  recommendations: Recommendation[];
  selectedEvent: string | null;
  onSelectEvent: (id: string) => void;
  status: string; // shown when there is nothing to recommend yet
  deviceNote: string; // where Gemma runs
  onRemoveInterest: (id: InterestId) => void;
  bottomInset: number;
};

const day = (iso: string) => String(new Date(iso).getDate());
const month = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');

export function LocalPanel({ place, interests, recommendations, selectedEvent, onSelectEvent, status, deviceNote, onRemoveInterest, bottomInset }: Props) {
  const cards = selectedEvent
    ? [...recommendations].sort((a, b) => Number(b.event.id === selectedEvent) - Number(a.event.id === selectedEvent))
    : recommendations;
  // The picked card moves first: scroll back so it stays in view.
  const list = useRef<ScrollViewInstance>(null);
  useEffect(() => list.current?.scrollTo({ x: 0, animated: true }), [selectedEvent]);
  return (
    <View style={[styles.panel, { paddingBottom: bottomInset + 12 }]}>
      <View style={styles.head}>
        <Text style={styles.label}>Per te qui</Text>
        <Text style={styles.title} numberOfLines={1}>{place}</Text>
      </View>

      {interests.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {interests.slice(0, 6).map((i) => (
            <Pressable
              key={i.id}
              onPress={() => onRemoveInterest(i.id)}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              hitSlop={{ top: 6, bottom: 6 }}
              accessibilityRole="button"
              accessibilityLabel={`Togli ${labelOf(i.id)} dai tuoi interessi`}
            >
              <Text style={styles.chipText}>{labelOf(i.id)}</Text>
              <Text style={styles.chipCount}>{i.photoCount}</Text>
              <Text style={styles.chipX}>✕</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {cards.length ? (
        <ScrollView ref={list} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
          {cards.map((r) => {
            const on = r.event.id === selectedEvent;
            return (
              <Pressable
                key={r.event.id}
                onPress={() => onSelectEvent(r.event.id)}
                style={({ pressed }) => [styles.card, on && styles.cardOn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${r.event.title}: mostra sulla mappa`}
              >
                <View style={styles.date}>
                  <Text style={[styles.day, on && styles.dayOn]}>{day(r.event.start)}</Text>
                  <Text style={styles.month}>{month(r.event.start)}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{r.event.title}</Text>
                  <View style={styles.meta}>
                    <Text style={styles.metaText} numberOfLines={1}>{r.event.city}</Text>
                    <Text style={styles.metaText}>{Math.round(r.distanceKm)} km</Text>
                    <Text style={styles.metaText}>{r.event.price}</Text>
                  </View>
                  <Text style={styles.why} numberOfLines={2}>{why(r)}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.status}>{status}</Text>
      )}
      <Text style={styles.note}>{deviceNote} Eventi di esempio, inventati per la demo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: C.bg, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg,
    borderTopWidth: 1, borderColor: C.line, paddingTop: 14, gap: S.md,
    boxShadow: '0 -12px 32px rgba(2, 8, 12, 0.45)',
  },
  head: { paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'baseline', gap: S.sm },
  label: { color: C.muted, fontFamily: F.medium, fontSize: 14 },
  title: { flexShrink: 1, color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.8 },
  chips: { gap: 6, paddingHorizontal: S.lg },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: R.sm,
    paddingVertical: 7, paddingLeft: 10, paddingRight: 9, backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
  },
  chipText: { color: C.text, fontFamily: F.medium, fontSize: 13.5 },
  chipCount: { color: C.accent, fontFamily: F.monoMedium, fontSize: 12, fontVariant: ['tabular-nums'] },
  chipX: { color: C.faint, fontSize: 10, marginLeft: 1 },
  pressed: { opacity: 0.6 },
  cards: { gap: S.sm, paddingHorizontal: S.lg },
  card: {
    width: 292, flexDirection: 'row', backgroundColor: C.card, borderRadius: R.md,
    borderWidth: 1, borderColor: C.line, paddingVertical: 12, paddingRight: 14,
  },
  cardOn: { borderColor: C.accent },
  date: {
    width: 54, alignItems: 'center', borderRightWidth: 1, borderRightColor: C.line, marginRight: 12,
  },
  day: { color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 28, letterSpacing: -0.6 },
  dayOn: { color: C.accent },
  month: { color: C.muted, fontFamily: F.monoMedium, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardBody: { flex: 1, gap: 5 },
  cardTitle: { color: C.text, fontFamily: F.bold, fontSize: 16, lineHeight: 20, letterSpacing: -0.2 },
  meta: { flexDirection: 'row', gap: 10 },
  metaText: { color: C.muted, fontFamily: F.mono, fontSize: 11.5, flexShrink: 1 },
  why: { color: C.accent, fontFamily: F.medium, fontSize: 13.5, lineHeight: 18 },
  status: { color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 21, paddingHorizontal: S.lg },
  note: { color: C.faint, fontFamily: F.body, fontSize: 11.5, lineHeight: 15, paddingHorizontal: S.lg },
});
