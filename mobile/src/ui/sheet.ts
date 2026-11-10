// The bottom sheet's physics: three resting heights, and where a drag comes to rest. Pure, so the
// test scripts run it in Node; src/ui/Sheet.tsx animates it.
export type Detent = 'low' | 'mid' | 'high';
export type Heights = Record<Detent, number>;

// Low shows a title and a line, middle a grid of photos, high the whole place.
export function detentHeights(screenHeight: number): Heights {
  return { low: 132, mid: Math.round(0.46 * screenHeight), high: Math.round(0.9 * screenHeight) };
}

// Like iOS sheets: project where the finger was heading over 0.2 s, then take the nearest height.
// `velocity` is the gesture's vertical speed in px/ms, negative upward (React Native's vy).
export function settle(height: number, velocity: number, heights: Heights): Detent {
  const projected = height - velocity * 200;
  return (Object.keys(heights) as Detent[]).reduce((best, d) =>
    Math.abs(heights[d] - projected) < Math.abs(heights[best] - projected) ? d : best,
  );
}
