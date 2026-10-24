// First launch: asks whether the app may read the photo gallery. Without it the map still works:
// you mark places by hand and the GPS marks where you are.
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
        <Text style={styles.title}>La tua galleria sa già dove sei stato e cosa ami.</Text>
        <Text style={styles.text}>
          Da data e posizione delle foto disegniamo la tua mappa. Gemma 4 guarda cosa fotografi e ti propone
          eventi su misura, dal mondo al tuo quartiere.
        </Text>
        <View style={styles.privacy}>
          <Text style={styles.privacyLabel}>Le foto restano tue</Text>
          <Text style={styles.privacyText}>Gemma gira sul tuo telefono o sul tuo computer, mai nel cloud.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onUseGallery} style={({ pressed }) => [styles.primary, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.primaryText}>Usa la mia galleria</Text>
        </Pressable>
        <Pressable onPress={onSkip} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]} accessibilityRole="button">
          <Text style={styles.secondaryText}>Continua senza galleria</Text>
        </Pressable>
        <Text style={styles.note}>Puoi cambiare idea quando vuoi dal pulsante Galleria sulla mappa.</Text>
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
  body: { gap: S.lg, marginTop: 'auto', marginBottom: S.xxl },
  title: { color: C.text, fontFamily: F.display, fontSize: 38, lineHeight: 41, letterSpacing: -1.4 },
  text: { color: C.muted, fontFamily: F.body, fontSize: 16.5, lineHeight: 24, maxWidth: 520 },
  privacy: {
    marginTop: S.xs, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: C.accent, gap: 3,
  },
  privacyLabel: { color: C.text, fontFamily: F.semi, fontSize: 15 },
  privacyText: { color: C.muted, fontFamily: F.body, fontSize: 15, lineHeight: 21 },
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
