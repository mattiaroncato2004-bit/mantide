// The two floating buttons top-right, as in Apple Maps: the map's style (satellite or standard) and
// back to where you are. The icons are drawn with views: the app ships no icon font.
import { Pressable, StyleSheet, View } from 'react-native';
import { t } from '../i18n';
import type { Basemap } from '../map/style';
import { C } from '../theme';

type Props = {
  top: number;
  basemap: Basemap;
  onToggleBasemap(): void;
  onBackToMe(): void;
};

export function MapButtons({ top, basemap, onToggleBasemap, onBackToMe }: Props) {
  return (
    <View style={[styles.group, { top }]}>
      <Pressable
        onPress={onToggleBasemap}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('buttons.mapStyle')}
        accessibilityState={{ selected: basemap === 'standard' }}
      >
        {/* Two stacked sheets: the "layers" sign. */}
        <View style={[styles.layer, styles.layerBack]} />
        <View style={[styles.layer, styles.layerFront]} />
      </Pressable>
      <View style={styles.rule} />
      <Pressable
        onPress={onBackToMe}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t('buttons.backToMe')}
      >
        <View style={styles.arrow} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    position: 'absolute', right: 12, width: 44, borderRadius: 10, overflow: 'hidden',
    backgroundColor: C.material, borderWidth: StyleSheet.hairlineWidth, borderColor: C.materialLine,
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
  },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: C.materialLine, marginHorizontal: 8 },
  layer: {
    position: 'absolute', width: 15, height: 15, borderRadius: 2.5, borderWidth: 1.8, borderColor: C.text,
    transform: [{ scaleY: 0.58 }, { rotate: '45deg' }],
  },
  layerBack: { top: 17, opacity: 0.6 },
  layerFront: { top: 12, backgroundColor: C.material },
  // The location arrow: a triangle pointing north-east.
  arrow: {
    width: 0, height: 0, marginTop: 2, borderLeftWidth: 7, borderRightWidth: 7, borderBottomWidth: 17,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: C.text,
    transform: [{ rotate: '45deg' }],
  },
});
