// Browser version of photoSource.ts: a browser sends its own User-Agent and may not change it.
import type { ImageURISource } from 'react-native';

export function photoSource(uri: string): ImageURISource {
  return { uri };
}
