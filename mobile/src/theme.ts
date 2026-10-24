// Visual tokens. The look is a field-survey instrument laid over the satellite map: ink panels,
// a characterful grotesque for places and headings, a mono for counts, dates and distances.
// One accent only, the same orange the map uses for "visited" (src/map/mapHtml.ts ACCENT).

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
};

// Custom fonts carry their weight in the family name: never pair them with fontWeight.
export const F = {
  display: 'BricolageGrotesque_800ExtraBold',
  bold: 'BricolageGrotesque_700Bold',
  semi: 'BricolageGrotesque_600SemiBold',
  medium: 'BricolageGrotesque_500Medium',
  body: 'BricolageGrotesque_400Regular',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
};

// Corner radii, one rule everywhere: controls 6, cards and buttons 10, floating panels and sheets 18.
export const R = { sm: 6, md: 10, lg: 18 };

// Spacing on a 4 pt grid.
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
