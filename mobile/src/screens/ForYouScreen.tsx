// "Per te" tab: events at the scale you are looking at, matched to your interests.
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { why, type Recommendation } from '../events/recommend';
import { C } from '../theme';

type Props = {
  recommendations: Recommendation[];
  scaleLabel: string;
  hasProfile: boolean;
  topInset: number;
};

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

export function ForYouScreen({ recommendations, scaleLabel, hasProfile, topInset }: Props) {
  return (
    <View style={[styles.root, { paddingTop: topInset + 16 }]}>
      <Text style={styles.title}>Per te · {scaleLabel}</Text>
      <Text style={styles.lead}>
        {hasProfile
          ? 'Eventi scelti in base a quello che fotografi. Cambia scala dalla mappa.'
          : 'Analizza le tue foto nella scheda Interessi: poi qui trovi gli eventi giusti per te.'}
      </Text>
      <FlatList
        data={recommendations}
        keyExtractor={(r) => r.event.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={hasProfile ? <Text style={styles.lead}>Nessun evento adatto a questa scala.</Text> : undefined}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <Text style={styles.meta}>
              {date(r.event.start)} · {r.event.city}
              {r.distanceKm < 300 ? ` · ${Math.round(r.distanceKm)} km` : ''} · {r.event.price}
            </Text>
            <Text style={styles.cardTitle}>{r.event.title}</Text>
            <Text style={styles.desc}>{r.event.description}</Text>
            <Text style={styles.why}>{why(r)}</Text>
          </View>
        )}
      />
      <Text style={styles.note}>Eventi di esempio, inventati per la demo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: C.bg, paddingHorizontal: 16 },
  title: { color: C.text, fontSize: 22, fontWeight: '700' },
  lead: { color: C.muted, fontSize: 15, marginTop: 6, lineHeight: 21 },
  list: { paddingVertical: 16, gap: 12 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line, gap: 6 },
  meta: { color: C.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  desc: { color: C.muted, fontSize: 14, lineHeight: 20 },
  why: { color: C.accent, fontSize: 14, fontWeight: '600' },
  note: { color: C.muted, fontSize: 11, textAlign: 'center', paddingBottom: 8 },
});
