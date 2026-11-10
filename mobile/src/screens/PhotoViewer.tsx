// One photo full screen: where and when on top, and below it what Gemma saw, like the details you get
// swiping up on an iPhone photo. ✕ or Android's back closes it.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { labelOf } from '../ai/interests';
import type { Analysis } from '../ai/gemma';
import { nameOf } from '../geo/locate';
import { formatDate, t } from '../i18n';
import type { Photo } from '../gallery/photos';
import { C, F } from '../theme';

type Props = {
  photo: Photo;
  analysis?: Analysis;
  onClose(): void;
  topInset: number;
  bottomInset: number;
};

export function PhotoViewer({ photo, analysis, onClose, topInset, bottomInset }: Props) {
  const where = photo.province ? nameOf('province', photo.province) : nameOf('country', photo.country);
  return (
    <View style={styles.root} testID="photo-viewer">
      <View style={[styles.bar, { paddingTop: topInset + 6 }]}>
        <Pressable onPress={onClose} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel={t('preview.close')}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <View style={styles.titles}>
          <Text style={styles.where} numberOfLines={1}>{where}</Text>
          <Text style={styles.when}>{formatDate(photo.takenAt, 'long')}</Text>
        </View>
      </View>
      <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="contain" />
      {analysis && (
        <View style={[styles.info, { paddingBottom: bottomInset + 18 }]}>
          <Text style={styles.label}>{t('preview.gemmaSaw')}</Text>
          <Text style={styles.scene}>{analysis.scene}</Text>
          <View style={styles.tags}>
            {analysis.interests.map((i) => (
              <Text key={i} style={styles.tag}>{labelOf(i)}</Text>
            ))}
          </View>
        </View>
      )}
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
  titles: { flex: 1, alignItems: 'center', marginRight: 44 },
  where: { color: C.text, fontFamily: F.bold, fontSize: 16, letterSpacing: -0.2 },
  when: { color: C.muted, fontFamily: F.medium, fontSize: 12 },
  image: { flex: 1 },
  info: {
    backgroundColor: '#1c1c1e', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    paddingHorizontal: 18, paddingTop: 16, gap: 6,
  },
  label: { color: C.accent, fontFamily: F.semi, fontSize: 12.5 },
  scene: { color: C.text, fontFamily: F.body, fontSize: 16, lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: {
    color: C.text, fontFamily: F.medium, fontSize: 13, backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 7, paddingVertical: 4, paddingHorizontal: 9, overflow: 'hidden',
  },
});
