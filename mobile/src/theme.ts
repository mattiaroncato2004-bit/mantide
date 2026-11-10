// Visual tokens. The look follows Apple's Photos and Maps: translucent dark materials over the map,
// one typeface (Inter, close to Apple's SF), one accent: the orange the map uses for "visited"
// (src/map/style.ts).

export const C = {
  bg: '#0a1217', // sheets and panels
  card: '#121c22', // raised rows inside a panel
  surface: 'rgba(10, 18, 23, 0.88)', // floating chrome over the map
  line: 'rgba(230, 236, 232, 0.12)', // hairlines
  lineStrong: 'rgba(230, 236, 232, 0.24)',
  text: '#edf0eb',
  muted: '#98a6a1',
  faint: '#66746f',
  accent: '#ff7a45',
  accentSoft: 'rgba(255, 122, 69, 0.14)',
  onAccent: '#1a0d06',
  material: 'rgba(28, 28, 30, 0.92)', // sheets and floating buttons over the map
  materialLine: 'rgba(255, 255, 255, 0.10)',
};

// Fonts carry their weight in the family name: never pair them with fontWeight. The `mono` roles are
// Inter too; numbers that must line up add `fontVariant: ['tabular-nums']`.
export const F = {
  display: 'Inter_800ExtraBold',
  bold: 'Inter_700Bold',
  semi: 'Inter_600SemiBold',
  medium: 'Inter_500Medium',
  body: 'Inter_400Regular',
  mono: 'Inter_400Regular',
  monoMedium: 'Inter_500Medium',
  monoSemi: 'Inter_600SemiBold',
};

// Corner radii, one rule everywhere: controls 6, cards and buttons 10, floating panels and sheets 18.
export const R = { sm: 6, md: 10, lg: 18 };

// Spacing on a 4 pt grid.
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
