// Interests tab: what your photos say about you, with the photos that prove it.
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { labelOf, type InterestId } from '../ai/interests';
import type { Photo } from '../gallery/photos';
import { C } from '../theme';

export type InterestRow = { id: InterestId; count: number; share: number; photos: Photo[] };

type Props = {
  rows: InterestRow[];
  analyzed: number;
  status: string | null;
  running: boolean;
  canRun: boolean;
  onRun: () => void;
  onRemove: (id: InterestId) => void;
  deviceNote: string;
  topInset: number;
};

export function InterestsScreen({ rows, analyzed, status, running, canRun, onRun, onRemove, deviceNote, topInset }: Props) {
  return (
    <View style={[styles.root, { paddingTop: topInset + 16 }]}>
      <Text style={styles.title}>Le tue foto dicono che ami…</Text>
      <Text style={styles.lead}>
        {analyzed
          ? `Gemma 4 ha guardato ${analyzed} foto, sul tuo computer: nessuna è finita nel cloud.`
          : 'Gemma 4 guarda le tue foto sul tuo computer e capisce cosa ti appassiona.'}
      </Text>
      <Text style={styles.device}>{deviceNote}</Text>

      <Pressable
        onPress={onRun}
        disabled={running || !canRun}
        style={({ pressed }) => [styles.button, (pressed || running || !canRun) && styles.buttonDim]}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>
          {running ? 'Gemma sta guardando…' : canRun ? 'Analizza le foto con Gemma' : 'Prima leggi la galleria'}
        </Text>
      </Pressable>
      {status && <Text style={styles.status}>{status}</Text>}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowHead}>
              <Text style={styles.rowTitle}>{labelOf(item.id)}</Text>
              <Text style={styles.rowCount}>{item.count} foto</Text>
              <Pressable onPress={() => onRemove(item.id)} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Togli ${labelOf(item.id)}`}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { width: `${Math.round(item.share * 100)}%` }]} />
            </View>
            <View style={styles.thumbs}>
              {item.photos.slice(0, 3).map((p) => (
                <Image key={p.id} source={{ uri: p.uri }} style={styles.thumb} />
              ))}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: C.bg, paddingHorizontal: 16 },
  title: { color: C.text, fontSize: 22, fontWeight: '700' },
  lead: { color: C.muted, fontSize: 15, marginTop: 6, lineHeight: 21 },
  button: { backgroundColor: C.accent, borderRadius: 999, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  buttonDim: { opacity: 0.6 },
  buttonText: { color: C.onAccent, fontWeight: '700', fontSize: 15 },
  status: { color: C.muted, fontSize: 13, marginTop: 8 },
  device: { color: C.muted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  list: { paddingVertical: 16, gap: 12 },
  row: { backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.line, gap: 8 },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rowTitle: { color: C.text, fontSize: 17, fontWeight: '700', flex: 1 },
  rowCount: { color: C.muted, fontSize: 13, fontVariant: ['tabular-nums'] },
  remove: { color: C.muted, fontSize: 15, paddingLeft: 4 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: C.accent },
  thumbs: { flexDirection: 'row', gap: 6 },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: C.line },
});
