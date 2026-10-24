// Browser version of storage.ts: localStorage behind the same async API as expo-sqlite/kv-store.
// A blocked or full localStorage just means nothing is remembered across reloads.

// Opening the app at "/?nuovo" forgets everything and starts again from the welcome screen: handy to
// hand a phone to the next tester.
try {
  if (new URLSearchParams(window.location.search).has('nuovo')) {
    localStorage.clear();
    window.history.replaceState(null, '', window.location.pathname);
  }
} catch {}

const Storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[storage] not saved', key, e);
    }
  },
};

export default Storage;
