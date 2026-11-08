// The browser keeps a cached copy of the saved data (localStorage). It must never be shown to,
// or uploaded for, a DIFFERENT account, so it is cleared whenever the signed-in person (or the
// business being viewed) changes: on sign-in, sign-up, sign-out and "View as".

const SCOPE_KEY = "hotspotpro-scope"; // deliberately without the "hotspotpro:" prefix so a purge keeps it

export function purgeLocalCache() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("hotspotpro:")) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.removeItem(SCOPE_KEY);
  } catch {
    // Storage blocked: nothing cached to clear.
  }
}

/** Safety net: if the data on the server belongs to a different scope than the cached copy, clear it and reload once. */
export function checkCacheScope(scope: string | undefined): boolean {
  if (!scope) return false;
  try {
    const stored = window.localStorage.getItem(SCOPE_KEY);
    if (stored === scope) return false;
    const hadCache = Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i)).some((k) => k?.startsWith("hotspotpro:"));
    window.localStorage.setItem(SCOPE_KEY, scope);
    if (stored !== null || hadCache) {
      purgeLocalCache();
      window.localStorage.setItem(SCOPE_KEY, scope);
      return true; // the caller reloads so nothing stale stays in memory
    }
  } catch {
    // ignore
  }
  return false;
}
