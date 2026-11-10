import { create } from "zustand";

// Session store — the signed-in account's token. The token is the source
// of truth for "is this browser signed in": a query that is refetching
// must never blank the screen, and the app must re-render the moment a
// sign-in or a sign-out happens (ADR-004 offline-first read cache).

const KEY = "reph.session";

function readToken(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

type SessionState = {
  token: string | null;
  setToken: (token: string | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  token: readToken(),
  setToken: (token) => {
    try {
      if (token) window.localStorage.setItem(KEY, token);
      else window.localStorage.removeItem(KEY);
    } catch {
      // Private mode — the session lasts for this page load only.
    }
    set({ token });
  },
}));

export function sessionToken(): string | null {
  return useSessionStore.getState().token;
}

export function setSessionToken(token: string): void {
  useSessionStore.getState().setToken(token);
}

export function clearSessionToken(): void {
  useSessionStore.getState().setToken(null);
}
