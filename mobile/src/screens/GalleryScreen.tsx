// Gallery tab: photos grouped by place. Tapping a group flies the map there.
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlaceGroup } from '../gallery/photos';
import { C } from '../theme';

type Props = {
  groups: PlaceGroup[];
  status: string | null; // scan progress or permission message
  scanning: boolean;
  onScan: () => void;
  onOpen: (group: PlaceGroup) => void;
  topInset: number;
};

export function GalleryScreen({ groups, status, scanning, onScan, onOpen, topInset }: Props) {
  const total = groups.reduce((n, g) => n + g.photos.length, 0);
  return (
    <View style={[styles.root, { paddingTop: topInset + 16 }]}>
      <Text style={styles.title}>Galleria</Text>
      <Text style={styles.lead}>
        {total
          ? `${total} foto con posizione, in ${groups.length} ${groups.length === 1 ? 'luogo' : 'luoghi'}.`
          : 'Leggo data e posizione delle tue foto. Restano sul telefono.'}
      </Text>

      <Pressable
        onPress={onScan}
        disabled={scanning}
        style={({ pressed }) => [styles.button, (pressed || scanning) && styles.buttonDim]}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{scanning ? 'Sto leggendo…' : total ? 'Rileggi la galleria' : 'Leggi la galleria'}</Text>
      </Pressable>
      {status && <Text style={styles.status}>{status}</Text>}

      <FlatList
        data={groups}
        keyExtractor={(g) => g.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item)} style={styles.group} accessibilityRole="button">
            <View style={styles.groupHead}>
              <Text style={styles.groupTitle}>{item.title}</Text>
              <Text style={styles.groupSub}>{item.subtitle}</Text>
            </View>
            <View style={styles.thumbs}>
              {item.photos.slice(0, 4).map((p) => (
                <Image key={p.id} source={{ uri: p.uri }} style={styles.thumb} />
              ))}
            </View>
          </Pressable>
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
  status: { color: C.muted, fontSize: 13, marginTop: 8, fontVariant: ['tabular-nums'] },
  list: { paddingVertical: 16, gap: 12 },
  group: { backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.line },
  groupHead: { marginBottom: 10 },
  groupTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  groupSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  thumbs: { flexDirection: 'row', gap: 6 },
  thumb: { flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: C.line },
});
