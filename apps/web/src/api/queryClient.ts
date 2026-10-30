import { QueryClient } from "@tanstack/react-query";

// App-wide QueryClient — a singleton so stores (Task 8) can invalidate
// server cache outside React trees (ADR-004 online-first read cache).

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 30_000 }, // offline-first read cache (ADR-004)
  },
});
