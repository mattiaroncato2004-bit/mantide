// The one bottom sheet of the main screen, like Apple Maps and Photos: three heights, dragged by its
// handle or header, settling with a spring. Its content scrolls only when it is fully up.
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { t } from '../i18n';
import { C, R } from '../theme';
import { detentHeights, settle, type Detent } from './sheet';

type Props = {
  detent: Detent;
  onDetentChange(detent: Detent): void;
  header: ReactNode;
  children: ReactNode;
  bottomInset: number;
};

const ORDER: Detent[] = ['low', 'mid', 'high'];
const SPRING = { damping: 22, stiffness: 220, mass: 1, useNativeDriver: false };

export function Sheet({ detent, onDetentChange, header, children, bottomInset }: Props) {
  const { height: screen } = useWindowDimensions();
  const heights = useMemo(() => detentHeights(screen), [screen]);
  const height = useRef(new Animated.Value(heights[detent])).current;
  const latest = useRef({ heights, onDetentChange, detent });
  latest.current = { heights, onDetentChange, detent };
  const start = useRef(0);

  useEffect(() => {
    Animated.spring(height, { toValue: heights[detent], ...SPRING }).start();
  }, [detent, heights, height]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => height.stopAnimation((value) => (start.current = value)),
      onPanResponderMove: (_e, g) => {
        const { heights: h } = latest.current;
        height.setValue(Math.min(h.high + 40, Math.max(h.low - 40, start.current - g.dy)));
      },
      onPanResponderRelease: (_e, g) => {
        const { heights: h, onDetentChange: change, detent: was } = latest.current;
        const next = settle(start.current - g.dy, g.vy, h);
        // Same detent: the effect won't run, so spring back here.
        if (next === was) Animated.spring(height, { toValue: h[next], ...SPRING }).start();
        change(next);
      },
    }),
  ).current;

  const step = (by: 1 | -1) => {
    const next = ORDER[Math.min(2, Math.max(0, ORDER.indexOf(detent) + by))];
    if (next !== detent) onDetentChange(next);
  };

  return (
    <Animated.View style={[styles.sheet, { height }]}>
      <View
        {...pan.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('sheet.handle')}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        testID="sheet-handle"
      >
        <View style={styles.grab} />
        {header}
      </View>
      <ScrollView scrollEnabled={detent === 'high'} contentContainerStyle={{ paddingBottom: bottomInset + 16 }}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden',
    backgroundColor: C.material, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.materialLine,
    boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.35)',
  },
  grab: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.35)', marginTop: 8, marginBottom: 10 },
});
