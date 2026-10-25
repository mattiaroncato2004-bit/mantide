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

// On a phone there is no console to look at: show any uncaught error on screen.
window.addEventListener('error', (e) => {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;margin:0;padding:10px;white-space:pre-wrap;' +
    'background:#2a0c0c;color:#ffd7d7;font:12px/1.4 monospace;border-radius:8px';
  box.textContent = `Errore: ${e.message}\n${e.filename ?? ''}:${e.lineno ?? ''}`;
  document.body.appendChild(box);
});

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
