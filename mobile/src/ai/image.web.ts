// Browser version of image.ts: loads the photo (Wikimedia allows cross-origin reads) and shrinks
// it to 384 px on a canvas.
export async function imageForGemma(uri: string): Promise<string> {
  const bitmap = await createImageBitmap(await (await fetch(uri)).blob());
  const scale = Math.min(1, 384 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}
