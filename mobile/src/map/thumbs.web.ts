// Browser version of thumbs.ts: the demo photos are already small web images (330 px),
// so the map uses their URLs directly.
export async function makeThumbs(photos: { id: string; uri: string }[]): Promise<Record<string, string>> {
  return Object.fromEntries(photos.map((p) => [p.id, p.uri]));
}
