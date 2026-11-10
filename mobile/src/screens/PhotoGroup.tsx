// The photos behind a thumbnail with a number on the map: tapping "4" shows all 4, oldest first.
// Tapping one opens it full screen. The Gallery button reuses it for all your photos.
import type { ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { nameOf } from '../geo/locate';
import { formatDate, t, tc } from '../i18n';
import type { Photo } from '../gallery/photos';
import { C, F, R, S } from '../theme';

type Props = {
  photos: Photo[];
  title?: string; // default: the places of the photos
  notice?: ReactNode; // shown above the photos
  onOpen: (id: string) => void;
  onClose: () => void;
  topInset: number;
  bottomInset: number;
};

const date = (ms: number) => formatDate(ms, 'medium');

export function PhotoGroup({ photos, title, notice, onOpen, onClose, topInset, bottomInset }: Props) {
  const sorted = [...photos].sort((a, b) => a.takenAt - b.takenAt);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const places = [...new Set(sorted.map((p) => (p.province ? nameOf('province', p.province) : nameOf('country', p.country))))];
  const when = !first ? '' : date(first.takenAt) === date(last.takenAt) ? date(first.takenAt) : `${date(first.takenAt)} – ${date(last.takenAt)}`;
  return (
    <View style={[styles.root, { paddingTop: topInset + S.lg }]}>
      <View style={styles.top}>
        <View style={styles.titles}>
          <Text style={styles.kicker}>{tc('count.photos', sorted.length)}</Text>
          <Text style={styles.title} numberOfLines={1}>{title ?? `${places.slice(0, 2).join(', ')}${places.length > 2 ? '…' : ''}`}</Text>
          {when ? <Text style={styles.when}>{when}</Text> : null}
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('photos.close')}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: bottomInset + S.xl }]}>
        {notice}
        {sorted.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onOpen(p.id)}
            style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t('photos.open', { date: date(p.takenAt) })}
          >
            <Image source={{ uri: p.uri }} style={styles.image} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: C.bg },
  top: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: S.xl, paddingBottom: S.lg, gap: S.md },
  titles: { flex: 1, gap: 2 },
  kicker: { color: C.accent, fontFamily: F.monoSemi, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: C.text, fontFamily: F.bold, fontSize: 24, letterSpacing: -0.6 },
  when: { color: C.muted, fontFamily: F.mono, fontSize: 12.5 },
  close: { color: C.muted, fontSize: 18, padding: S.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: S.lg - 2 },
  cell: { width: '33.333%', aspectRatio: 1, padding: 2 },
  image: { flex: 1, borderRadius: R.sm, backgroundColor: C.surface },
  pressed: { opacity: 0.7 },
});
