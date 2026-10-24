// Where photos come from on Android: the device gallery. The browser build uses source.web.ts.
import * as MediaLibrary from 'expo-media-library/legacy'; // the non-legacy import throws at runtime in SDK 58

export type GalleryAccess = 'all' | 'limited' | 'denied';

export type RawPhoto = {
  id: string;
  uri: string;
  filename: string;
  takenAt: number; // ms since epoch
  gps: { latitude: number; longitude: number } | null;
};

const PAGE = 100;

export async function requestGallery(): Promise<GalleryAccess> {
  const res = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  if (!res.granted) return 'denied';
  return res.accessPrivileges === 'limited' ? 'limited' : 'all';
}

// Android 14+: lets a user who shared only some photos share the rest.
export const askForAllPhotos = () => MediaLibrary.presentPermissionsPickerAsync(['photo']);

// Reads the gallery page by page, newest first, and hands each page to onPage.
export async function readGallery(onPage: (photos: RawPhoto[], read: number) => void, limit: number): Promise<void> {
  let read = 0;
  let after: string | undefined;
  do {
    // resolveWithFullInfo is what fills `location` on Android (about 5× slower, still fine).
    const page = await MediaLibrary.getAssetsAsync({
      first: PAGE,
      after,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      resolveWithFullInfo: true,
    });
    read += page.assets.length;
    onPage(
      page.assets.map((a) => ({
        id: a.id,
        uri: a.uri,
        filename: a.filename,
        takenAt: a.creationTime,
        gps: a.location && (a.location.latitude || a.location.longitude) ? a.location : null,
      })),
      read,
    );
    after = page.hasNextPage ? page.endCursor : undefined;
  } while (after && read < limit);
}
