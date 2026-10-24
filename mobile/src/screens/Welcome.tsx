// First launch: asks whether the app may read the photo gallery. Without it the map still works:
// you mark places by hand and the GPS marks where you are. The title is the whole product in three
// beats (map, interests, events); the panel says the two ideas that matter: Gemma 4 and privacy.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, R, S } from '../theme';

type Props = {
  onUseGallery: () => void;
  onSkip: () => void;
  topInset: number;
  bottomInset: number;
};

export function Welcome({ onUseGallery, onSkip, topInset, bottomInset }: Props) {
  return (
    <View style={[styles.root, { paddingTop: topInset + 28, paddingBottom: bottomInset + 20 }]}>
      <View style={styles.brand}>
        <View style={styles.mark} />
        <Text style={styles.wordmark}>Mantide</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Dove sei stato, cosa ami, cosa fare vicino a te.</Text>
        <Text style={styles.text}>Mantide lo scopre dalle foto che hai già.</Text>
        <View style={styles.points}>
          <View style={styles.point}>
            <Text style={styles.pointLabel}>Gemma 4</Text>
            <Text style={styles.pointText}>Capisce le tue passioni da cosa fotografi.</Text>
          </View>
          <View style={[styles.point, styles.pointRule]}>
            <Text style={styles.pointLabel}>Privacy</Text>
            <Text style={styles.pointText}>Le foto restano tue, mai nel cloud.</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onUseGallery} style={({ pressed }) => [styles.primary, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.primaryText}>Usa la mia galleria</Text>
        </Pressable>
        <Pressable onPress={onSkip} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.secondaryText}>Continua senza galleria</Text>
        </Pressable>
        <Text style={styles.note}>Puoi cambiare idea da Galleria.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    paddingHorizontal: S.xl, justifyContent: 'space-between',
    // The globe shows through at the top and sinks into ink where the text sits.
    backgroundColor: 'rgba(8, 15, 19, 0.92)',
    backgroundImage: 'linear-gradient(180deg, rgba(8, 15, 19, 0.8) 0%, rgba(8, 15, 19, 0.93) 34%, rgba(8, 15, 19, 0.99) 62%)',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 12, height: 12, borderRadius: 3, backgroundColor: C.accent, transform: [{ rotate: '45deg' }] },
  wordmark: { color: C.text, fontFamily: F.bold, fontSize: 18, letterSpacing: -0.3 },
  // Centred between the brand and the buttons: no empty band on top.
  body: { flex: 1, justifyContent: 'center', gap: S.md, paddingVertical: S.xl },
  title: { color: C.text, fontFamily: F.display, fontSize: 36, lineHeight: 39, letterSpacing: -1.3 },
  text: { color: C.muted, fontFamily: F.body, fontSize: 16, lineHeight: 23, maxWidth: 520 },
  // The two promises in one ruled panel, like the readout at the top of the map.
  points: { marginTop: S.sm, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: 'rgba(255, 255, 255, 0.03)' },
  point: { paddingVertical: 12, paddingHorizontal: 14, gap: 3 },
  pointRule: { borderTopWidth: 1, borderTopColor: C.line },
  pointLabel: { color: C.accent, fontFamily: F.monoSemi, fontSize: 11.5, letterSpacing: 1.2, textTransform: 'uppercase' },
  pointText: { color: C.text, fontFamily: F.medium, fontSize: 15.5, lineHeight: 21 },
  actions: { gap: S.sm },
  primary: { backgroundColor: C.accent, borderRadius: R.md, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: C.onAccent, fontFamily: F.bold, fontSize: 17, letterSpacing: -0.2 },
  secondary: {
    borderRadius: R.md, minHeight: 52, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.lineStrong,
  },
  secondaryText: { color: C.text, fontFamily: F.semi, fontSize: 16 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  note: { color: C.faint, fontFamily: F.mono, fontSize: 11.5, lineHeight: 16, textAlign: 'center', marginTop: S.sm },
});
