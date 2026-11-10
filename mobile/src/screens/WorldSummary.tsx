// The sheet far out: your world in one line, your level and how far the next one is. Tapping it opens
// the passport; the timeline starts from here because the journey is a whole-world view.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDecimal, t, tc } from '../i18n';
import type { Passport } from '../stats/passport';
import { C, F } from '../theme';

type Props = {
  travel: Passport;
  status: string | null; // reading the gallery, Gemma at work: shown in place of the level
  onOpenPassport(): void;
  onTimeline?: () => void; // absent with fewer than two photos
};

export function WorldSummary({ travel, status, onOpenPassport, onTimeline }: Props) {
  const { countries, level } = travel;
  const line = tc('world.line', countries.visited, { pct: formatDecimal(countries.landPct, 1) });
  const next = level.next && t('world.next', { count: level.next.missing, level: level.next.name });
  const progress = level.next ? countries.visited / (countries.visited + level.next.missing) : 1;
  return (
    // Not an accessibility element itself: the title and the line stay readable one by one.
    <Pressable onPress={onOpenPassport} accessible={false} style={styles.root}>
      <View style={styles.top}>
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header">{t('world.title')}</Text>
          <Text style={styles.line} numberOfLines={1}>{line}</Text>
        </View>
        {onTimeline && (
          <Pressable onPress={onTimeline} hitSlop={6} style={({ pressed }) => [styles.chip, pressed && styles.pressed]} accessibilityRole="button">
            <Text style={styles.chipText}>{t('tools.timeline')}</Text>
          </Pressable>
        )}
      </View>
      {status ? (
        <Text style={styles.status} numberOfLines={1}>{status}</Text>
      ) : (
        <Pressable
          onPress={onOpenPassport}
          style={styles.level}
          accessibilityRole="button"
          accessibilityLabel={t('world.a11y', { line, level: next ? `${level.name}, ${next}` : level.name })}
        >
          <Text style={styles.levelName}>{level.name}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(4, Math.round(100 * progress))}%` }]} />
          </View>
          {next ? <Text style={styles.next} numberOfLines={1}>{next}</Text> : null}
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 16, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titles: { flex: 1, gap: 1 },
  title: { color: C.text, fontFamily: F.bold, fontSize: 22, lineHeight: 27, letterSpacing: -0.5 },
  line: { color: C.muted, fontFamily: F.medium, fontSize: 13.5, fontVariant: ['tabular-nums'] },
  chip: { marginTop: 2, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.10)' },
  chipText: { color: C.text, fontFamily: F.semi, fontSize: 13 },
  pressed: { opacity: 0.6 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 20 },
  levelName: { color: C.accent, fontFamily: F.semi, fontSize: 13 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.12)', overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3, backgroundColor: C.accent },
  next: { color: C.muted, fontFamily: F.medium, fontSize: 12, fontVariant: ['tabular-nums'] },
  status: { color: C.accent, fontFamily: F.medium, fontSize: 12.5, minHeight: 20 },
});
