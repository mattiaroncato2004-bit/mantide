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
  onUseGallery?: () => void; // only with the sample photos
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

export function PassportSheet({ data, interests, onRemoveInterest, onStopGallery, onUseGallery, onClose, topInset, bottomInset }: Props) {
  const { countries, level, continents, here, byCountry } = data;
  const missingRegions = here ? here.regions.total - here.regions.visited : 0;
  return (
    <View style={styles.root}>
      {/* The map stays behind, dimmed; tapping it closes the passport, as with an iPhone sheet. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
      <View style={[styles.sheet, { top: topInset + 10 }]} testID="passport">
        <View style={styles.grab} />
        <View style={styles.top}>
          <Text style={styles.title} accessibilityRole="header">{t('passport.kicker')}</Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.close} accessibilityRole="button" accessibilityLabel={t('passport.close')}>
            <Text style={styles.closeText}>✕</Text>
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
          {onUseGallery && (
            <Pressable onPress={onUseGallery} style={styles.stop} accessibilityRole="button">
              <Text style={styles.stopText}>{t('gallery.useInstead')}</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const FILL = 'rgba(255, 255, 255, 0.07)';

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  // A full-height sheet, like the place sheet: the same material and corners.
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.sheet,
    borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.materialLine,
  },
  grab: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.35)', marginTop: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.lg, paddingTop: S.md },
  title: { color: C.text, fontFamily: F.bold, fontSize: 22, letterSpacing: -0.5 },
  close: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  closeText: { color: C.text, fontSize: 13 },
  content: { paddingHorizontal: S.lg, paddingTop: S.lg, gap: S.md },
  hero: { gap: S.sm, paddingBottom: S.sm },
  level: { color: C.accent, fontFamily: F.semi, fontSize: 15 },
  big: { color: C.text, fontFamily: F.display, fontSize: 52, lineHeight: 56, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  bigUnit: { fontFamily: F.bold, fontSize: 24, letterSpacing: -0.6, color: C.muted },
  sub: { color: C.muted, fontFamily: F.medium, fontSize: 13, marginBottom: S.xs },
  // Each group of numbers is a card, as in the iPhone's grouped lists.
  section: { gap: S.md, backgroundColor: FILL, borderRadius: 13, padding: 14 },
  sectionTitle: { color: C.text, fontFamily: F.bold, fontSize: 17, letterSpacing: -0.3 },
  row: { gap: 6 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLabel: { color: C.text, fontFamily: F.medium, fontSize: 15 },
  rowCount: { color: C.muted, fontFamily: F.semi, fontSize: 13, fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255, 255, 255, 0.12)', overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3, backgroundColor: C.accent },
  hint: { color: C.muted, fontFamily: F.medium, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: R.sm, minHeight: 36,
    paddingHorizontal: 10, backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipText: { color: C.text, fontFamily: F.medium, fontSize: 13.5 },
  chipCount: { color: C.accent, fontFamily: F.semi, fontSize: 12, fontVariant: ['tabular-nums'] },
  chipX: { color: C.faint, fontSize: 10 },
  pressed: { opacity: 0.6 },
  stop: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: FILL, borderRadius: 13 },
  stopText: { color: C.muted, fontFamily: F.semi, fontSize: 15 },
});
