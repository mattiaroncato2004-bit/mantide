// The photos behind a numbered pin, or all the photos of a place: a grid, oldest first, under the
// places and dates they span. Tapping one opens it full screen.
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { nameOf } from '../geo/locate';
import { formatDate, t, tc } from '../i18n';
import type { Photo } from '../gallery/photos';
import { C, F } from '../theme';
import { photoSource } from '../ui/photoSource';

type Props = {
  photos: Photo[];
  thumbs: Record<string, string>;
  title?: string; // default: the places of the photos
  onOpen(id: string): void;
  onClose(): void;
  topInset: number;
  bottomInset: number;
};

const date = (ms: number) => formatDate(ms, 'medium');
const where = (p: Photo) => (p.province ? nameOf('province', p.province) : nameOf('country', p.country));

export function PhotoGroup({ photos, thumbs, title, onOpen, onClose, topInset, bottomInset }: Props) {
  const sorted = [...photos].sort((a, b) => a.takenAt - b.takenAt);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const places = [...new Set(sorted.map(where))];
  const span = !first ? '' : date(first.takenAt) === date(last.takenAt) ? date(first.takenAt) : `${date(first.takenAt)} – ${date(last.takenAt)}`;
  return (
    <View style={[styles.root, { paddingTop: topInset + 6 }]}>
      <View style={styles.bar}>
        <Pressable onPress={onClose} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel={t('photos.close')}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>{title ?? `${places.slice(0, 2).join(', ')}${places.length > 2 ? '…' : ''}`}</Text>
          <Text style={styles.sub} numberOfLines={1}>{[tc('count.photos', sorted.length), span].filter(Boolean).join(' · ')}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: bottomInset + 16 }]}>
        {sorted.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onOpen(p.id)}
            style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('photos.open', { date: date(p.takenAt) })}
            testID="group-photo"
          >
            <Image source={photoSource(thumbs[p.id] ?? p.uri)} style={styles.image} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingBottom: 10 },
  close: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)', margin: 4,
  },
  closeText: { color: C.text, fontSize: 15 },
  titles: { flex: 1, gap: 1 },
  title: { color: C.text, fontFamily: F.bold, fontSize: 17, letterSpacing: -0.3 },
  sub: { color: C.muted, fontFamily: F.medium, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '33.333%', aspectRatio: 1, padding: 1 },
  image: { flex: 1, backgroundColor: '#1c1c1e' },
  pressed: { opacity: 0.7 },
});
