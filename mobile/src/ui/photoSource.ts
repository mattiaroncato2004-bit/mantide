// The source of a photo <Image>. Photos from the web (the sample gallery, on Wikimedia Commons) are
// asked for with the app's name: Wikimedia's user-agent policy refuses Android's generic image
// loader (okhttp/…, 403). The browser build (photoSource.web.ts) leaves that to the browser.
import type { ImageURISource } from 'react-native';

export const USER_AGENT = 'Mantide (https://github.com/mattiaroncato2004-bit/mantide)';

export function photoSource(uri: string): ImageURISource {
  return /^https?:/.test(uri) ? { uri, headers: { 'User-Agent': USER_AGENT } } : { uri };
}
