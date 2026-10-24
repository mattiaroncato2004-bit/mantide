// Shrinks a photo to 384 px for Gemma and returns it as a data URL: fewer image tokens, and the
// original never leaves the device. The browser build uses image.web.ts.
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export async function imageForGemma(uri: string): Promise<string> {
  const small = await manipulateAsync(uri, [{ resize: { width: 384 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return `data:image/jpeg;base64,${small.base64}`;
}
