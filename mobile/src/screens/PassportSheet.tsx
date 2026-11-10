// "Your passport": travel stats, opened from the sheet far out ("Your world"). Every number comes with
// what is missing, so the next country or region is always in sight. It also holds what Gemma thinks
// you photograph (tap one to remove it) and the way to stop using the gallery.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { labelOf, type InterestId } from '../ai/interests';
import type { InterestWeight } from '../events/recommend';
import { formatDecimal, t, tc } from '../i18n';
import type { Count, Passport } from '../stats/passport';
import { C, F, R, S } from '../theme';

type Props = {
  data: Passport;
  interests: InterestWeight[];
  onRemoveInterest: (id: InterestId) => void;
  onStopGallery?: () => void; // only while the gallery is in use
  onClose: () => void;
  topInset: number;
  bottomInset: number;
};

const pct = (c: Count) => (c.total ? Math.round((100 * c.visited) / c.total) : 0);

function Bar({ value }: { value: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(2, Math.min(100, value))}%` }]} />
    </View>
  );
}

function Row({ label, count, hint }: { label: string; count: Count; hint?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowCount}>
          {count.visited}/{count.total}
        </Text>
      </View>
      <Bar value={pct(count)} />
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export function PassportSheet({ data, interests, onRemoveInterest, onStopGallery, onClose, topInset, bottomInset }: Props) {
  const { countries, level, continents, here, byCountry } = data;
  const missingRegions = here ? here.regions.total - here.regions.visited : 0;
  return (
    <View style={[styles.root, { paddingTop: topInset + S.lg }]}>
      <View style={styles.top}>
        <Text style={styles.kicker}>{t('passport.kicker')}</Text>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('passport.close')}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset + S.xxl }]}>
        <View style={styles.hero}>
          <Text style={styles.level}>{level.name}</Text>
          <Text style={styles.big}>
            {countries.visited} <Text style={styles.bigUnit}>{tc('unit.country', countries.visited)}</Text>
          </Text>
          <Text style={styles.sub}>
            {t('passport.share', { land: formatDecimal(countries.landPct, 1), pct: pct(countries), total: countries.total })}
          </Text>
          {level.next && (
            <>
              <Bar value={(100 * countries.visited) / (countries.visited + level.next.missing)} />
              <Text style={styles.hint}>{tc('passport.next', level.next.missing, { level: level.next.name })}</Text>
            </>
          )}
        </View>

        {here && here.regions.total > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('passport.here', { name: here.name })}</Text>
            <Row
              label={t('passport.regions')}
              count={here.regions}
              hint={missingRegions ? t('passport.missing', { count: missingRegions }) : t('passport.allSeen')}
            />
            {here.provinces && (
              <Row
                label={t('passport.provinces')}
                count={here.provinces}
                hint={t('passport.missing', { count: here.provinces.total - here.provinces.visited })}
              />
            )}
          </View>
        )}

        {interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('interests.title')}</Text>
            <View style={styles.chips}>
              {interests.map((i) => (
                <Pressable
                  key={i.id}
                  onPress={() => onRemoveInterest(i.id)}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t('interests.remove', { interest: labelOf(i.id) })}
                >
                  <Text style={styles.chipText}>{labelOf(i.id)}</Text>
                  <Text style={styles.chipCount}>{i.photoCount}</Text>
                  <Text style={styles.chipX}>✕</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('passport.continents')}</Text>
          {continents.map((c) => (
            <Row key={c.name} label={c.name} count={c} />
          ))}
        </View>

        {byCountry.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('passport.byCountry')}</Text>
            {byCountry.map((c) => (
              <Row key={c.id} label={c.name} count={c.regions} />
            ))}
          </View>
        )}

        {onStopGallery && (
          <Pressable onPress={onStopGallery} style={styles.stop} accessibilityRole="button">
            <Text style={styles.stopText}>{t('gallery.stop')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: C.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.xl },
  kicker: { color: C.accent, fontFamily: F.monoSemi, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  close: { color: C.muted, fontSize: 18, padding: S.xs },
  content: { paddingHorizontal: S.xl, paddingTop: S.lg, gap: S.xl },
  hero: { gap: S.sm },
  level: { color: C.accent, fontFamily: F.bold, fontSize: 17 },
  big: { color: C.text, fontFamily: F.display, fontSize: 56, lineHeight: 58, letterSpacing: -2 },
  bigUnit: { fontFamily: F.bold, fontSize: 26, letterSpacing: -0.6, color: C.muted },
  sub: { color: C.muted, fontFamily: F.mono, fontSize: 13, marginBottom: S.xs },
  section: { gap: S.md, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.lg },
  sectionTitle: { color: C.text, fontFamily: F.bold, fontSize: 18, letterSpacing: -0.3 },
  row: { gap: 6 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLabel: { color: C.text, fontFamily: F.medium, fontSize: 15 },
  rowCount: { color: C.muted, fontFamily: F.monoMedium, fontSize: 13 },
  track: { height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.accent },
  hint: { color: C.faint, fontFamily: F.mono, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: R.sm, minHeight: 36,
    paddingHorizontal: 10, backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  chipText: { color: C.text, fontFamily: F.medium, fontSize: 13.5 },
  chipCount: { color: C.accent, fontFamily: F.semi, fontSize: 12, fontVariant: ['tabular-nums'] },
  chipX: { color: C.faint, fontSize: 10 },
  pressed: { opacity: 0.6 },
  stop: { paddingVertical: S.md, borderTopWidth: 1, borderTopColor: C.line },
  stopText: { color: C.muted, fontFamily: F.medium, fontSize: 14, textDecorationLine: 'underline' },
});
