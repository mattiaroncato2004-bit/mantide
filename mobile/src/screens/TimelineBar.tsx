// The timeline: drag the handle left or right to travel back through your photos, or play the
// whole journey. Built on PanResponder, so it needs no native slider and also runs in a browser.
import { useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { t } from '../i18n';
import { C, F, R, S } from '../theme';

type Props = {
  count: number; // photos on the timeline
  index: number; // the current photo, 0 = oldest
  onChange: (index: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
  place: string; // "Venezia"
  // One mark per photo, at its position on the line (0..1); trips start with a labelled long mark.
  marks: { at: number; label?: string }[];
  onClose: () => void;
  bottomInset: number;
};

export function TimelineBar({ count, index, onChange, playing, onTogglePlay, place, marks, onClose, bottomInset }: Props) {
  const width = useRef(1);
  const startX = useRef(0);
  // The responder is created once: it reads the latest values through this ref.
  const latest = useRef({ count, onChange });
  latest.current = { count, onChange };

  // x is measured from the left edge of the track (the handle ignores touches, so the track gets them).
  const pick = (x: number) => {
    const { count: n, onChange: change } = latest.current;
    const at = Math.max(0, Math.min(1, x / width.current));
    change(Math.round(at * (n - 1)));
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        startX.current = e.nativeEvent.locationX;
        pick(startX.current);
      },
      onPanResponderMove: (_e, g) => pick(startX.current + g.dx),
    }),
  ).current;

  const progress = count > 1 ? index / (count - 1) : 1;

  return (
    <View style={[styles.bar, { paddingBottom: bottomInset + S.md }]} testID="timeline">
      <View style={styles.head}>
        <Pressable
          onPress={onTogglePlay}
          style={({ pressed }) => [styles.play, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={playing ? t('timeline.pause') : t('timeline.play')}
        >
          <Text style={styles.playText}>{playing ? '❚❚' : '▶'}</Text>
        </Pressable>
        <View style={styles.label}>
          <Text style={styles.place} numberOfLines={1}>{place}</Text>
          <Text style={styles.date}>{t('timeline.position', { n: index + 1, total: count })}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel={t('timeline.close')}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View
        onLayout={(e: LayoutChangeEvent) => (width.current = e.nativeEvent.layout.width || 1)}
        style={styles.hit}
        accessibilityRole="adjustable"
        accessibilityLabel={t('timeline.a11y')}
        accessibilityValue={{ min: 1, max: count, now: index + 1 }}
        {...pan.panHandlers}
      >
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
        {marks.map((m, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[styles.tick, m.label ? styles.tickMajor : null, m.at <= progress && styles.tickPassed, { left: `${m.at * 100}%` }]}
          />
        ))}
        <View style={[styles.thumb, { left: `${progress * 100}%` }]} pointerEvents="none" />
      </View>
      <View style={styles.labels} pointerEvents="none">
        {marks.map((m, i) =>
          m.label ? (
            <Text
              key={i}
              style={[styles.markLabel, m.at < 0.08 ? styles.markFirst : m.at > 0.92 ? styles.markLast : null, { left: `${m.at * 100}%` }]}
              numberOfLines={1}
            >
              {m.label}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // In place of the sheet while it plays: the same material, corners and edge.
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: C.sheet, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.materialLine,
    paddingHorizontal: S.lg, paddingTop: S.lg, boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.35)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  play: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
  },
  playText: { color: C.onAccent, fontFamily: F.bold, fontSize: 15 },
  pressed: { opacity: 0.75 },
  label: { flex: 1, gap: 1 },
  place: { color: C.text, fontFamily: F.bold, fontSize: 20, letterSpacing: -0.4 },
  date: { color: C.muted, fontFamily: F.medium, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  close: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  closeText: { color: C.text, fontSize: 13 },
  // A tall touch area around a thin track, so the handle is easy to grab with a finger.
  hit: { height: 40, justifyContent: 'center', marginTop: S.sm },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.14)', overflow: 'hidden' },
  fill: { height: 4, backgroundColor: C.accent },
  thumb: {
    position: 'absolute', width: 22, height: 22, marginLeft: -11, borderRadius: 11,
    backgroundColor: C.text, borderWidth: 4, borderColor: C.accent,
  },
  // Marks along the line: short for each photo, long where a trip starts; orange once passed.
  tick: { position: 'absolute', width: 1, height: 8, marginLeft: -0.5, backgroundColor: 'rgba(255, 255, 255, 0.24)' },
  tickMajor: { height: 16, width: 2, marginLeft: -1, backgroundColor: C.muted },
  tickPassed: { backgroundColor: C.accent },
  labels: { height: 16 },
  markLabel: {
    position: 'absolute', width: 52, marginLeft: -26, textAlign: 'center',
    color: C.muted, fontFamily: F.medium, fontSize: 10.5,
  },
  // Labels at the ends grow inward so they stay inside the bar.
  markFirst: { marginLeft: 0, textAlign: 'left' },
  markLast: { marginLeft: -52, textAlign: 'right' },
});
