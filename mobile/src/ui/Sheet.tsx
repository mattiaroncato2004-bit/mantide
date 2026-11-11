// The one bottom sheet of the main screen, like Apple Maps and Photos: three heights, dragged by its
// handle or header, settling with a spring. Its content scrolls once it is up (middle or full height).
import { useEffect, useMemo, useRef, type ComponentRef, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, ScrollView, StyleSheet, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { t } from '../i18n';
import { C, R } from '../theme';
import { detentHeights, settle, type Detent } from './detents';

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
  const heights = useMemo(() => detentHeights(screen, bottomInset), [screen, bottomInset]);
  const height = useRef(new Animated.Value(heights[detent])).current;
  const latest = useRef({ heights, onDetentChange, detent });
  latest.current = { heights, onDetentChange, detent };
  const start = useRef(0);
  const dragged = useRef(false); // this press became a drag of the sheet

  useEffect(() => {
    Animated.spring(height, { toValue: heights[detent], ...SPRING }).start();
  }, [detent, heights, height]);

  const pan = useRef(
    PanResponder.create({
      // Every press starts as a tap; it becomes a drag once the sheet takes it.
      onStartShouldSetPanResponderCapture: () => {
        dragged.current = false;
        return false;
      },
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        dragged.current = true;
        height.stopAnimation((value) => (start.current = value));
      },
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

  // In a browser a mouse drag still ends with a click on what it started on ("Your world" would open
  // the passport): the click that ends a drag of the sheet stops here, before it reaches the header's
  // buttons. Phones cancel the tap themselves.
  const top = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = top.current as unknown as HTMLElement | null;
    const swallow = (e: MouseEvent) => {
      if (!dragged.current) return;
      dragged.current = false;
      e.stopPropagation();
      e.preventDefault();
    };
    el?.addEventListener('click', swallow, true);
    return () => el?.removeEventListener('click', swallow, true);
  }, []);

  const step = (by: 1 | -1) => {
    const next = ORDER[Math.min(2, Math.max(0, ORDER.indexOf(detent) + by))];
    if (next !== detent) onDetentChange(next);
  };

  return (
    <Animated.View style={[styles.sheet, { height }]} testID={`sheet-${detent}`}>
      {/* The whole top drags the sheet; the grab bar alone is the control screen readers move, so the
          header's own text and buttons stay reachable one by one. */}
      <View ref={top} {...pan.panHandlers} style={styles.top} testID="sheet-handle">
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t('sheet.handle')}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
          style={styles.grabArea}
        >
          <View style={styles.grab} />
        </View>
        {header}
      </View>
      {/* At the low height the sheet is its header alone: the content fades in as it rises. */}
      <Animated.View style={[styles.content, { pointerEvents: detent === 'low' ? 'none' : 'auto', opacity: height.interpolate({ inputRange: [heights.low, heights.low + 48], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
        <ScrollView scrollEnabled={detent !== 'low'} contentContainerStyle={{ paddingBottom: bottomInset + 16 }}>
          {children}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, overflow: 'hidden',
    backgroundColor: C.sheet, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.materialLine,
    boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.35)',
  },
  // With a mouse, dragging over text would select it, and a selection ends the drag (react-native-web).
  // React Native's types know userSelect only on Text; the web applies it to any view.
  top: { userSelect: 'none' } as ViewStyle,
  content: { flex: 1 },
  grabArea: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 8, paddingBottom: 10 },
  grab: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.35)' },
});
