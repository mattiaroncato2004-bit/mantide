// The sheet at middle height: the photos on the part of the map you're looking at, newest first, as
// in the Photos map. Without the gallery, the way to connect it.
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { C, F, R } from '../theme';

const SHOWN = 40;

type Props = {
  photos: { id: string; uri: string }[];
  onOpen(id: string): void;
  onSeeAll(): void;
  consent?: { text: string; onAllow(): void }; // the gallery isn't connected
};

export function AreaPhotos({ photos, onOpen, onSeeAll, consent }: Props) {
  if (consent) {
    return (
      <View style={styles.consent}>
        <Text style={styles.consentTitle}>{t('gallery.connect')}</Text>
        <Text style={styles.consentText}>{consent.text}</Text>
        <Pressable onPress={consent.onAllow} style={({ pressed }) => [styles.button, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.buttonText}>{t('gallery.use')}</Text>
        </Pressable>
      </View>
    );
  }
  if (!photos.length) return <Text style={styles.none}>{t('area.none')}</Text>;
  return (
    <View style={styles.root} testID="area-photos">
      <View style={styles.grid}>
        {photos.slice(0, SHOWN).map((p) => (
          <Pressable key={p.id} onPress={() => onOpen(p.id)} style={styles.cell} accessibilityRole="imagebutton" testID="area-photo">
            <Image source={{ uri: p.uri }} style={styles.image} />
          </Pressable>
        ))}
      </View>
      {photos.length > SHOWN && (
        <Pressable onPress={onSeeAll} hitSlop={8} style={styles.more} accessibilityRole="button">
          <Text style={styles.link}>{t('place.seeAll')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 1.5 },
  cell: { width: '25%', aspectRatio: 1, padding: 1.5 },
  image: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.07)' },
  more: { alignSelf: 'center', paddingVertical: 14 },
  link: { color: C.accent, fontFamily: F.medium, fontSize: 14 },
  none: { color: C.muted, fontFamily: F.body, fontSize: 15, paddingHorizontal: 16, paddingTop: 16 },
  consent: { margin: 16, marginTop: 14, padding: 16, gap: 8, borderRadius: 13, backgroundColor: 'rgba(255, 255, 255, 0.07)' },
  consentTitle: { color: C.text, fontFamily: F.bold, fontSize: 17, letterSpacing: -0.3 },
  consentText: { color: C.muted, fontFamily: F.body, fontSize: 14.5, lineHeight: 21 },
  button: { marginTop: 6, minHeight: 48, borderRadius: R.md, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: C.onAccent, fontFamily: F.bold, fontSize: 16 },
  pressed: { opacity: 0.7 },
});
