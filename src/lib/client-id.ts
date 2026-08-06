const CLIENT_ID_KEY = "resumebuilder.client-id";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable browser id so cloud history can sync across sessions on this device. */
export function getClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const next = createId();
    localStorage.setItem(CLIENT_ID_KEY, next);
    return next;
  } catch {
    return createId();
  }
}
