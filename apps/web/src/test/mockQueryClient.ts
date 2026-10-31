// Shared in-memory queryClient mock — the module mocks in bun persist for
// the whole test process, so activeWorkout.test and restTimer.test must
// observe the SAME instance regardless of which factory materialises.

export const mockedQueryClient = {
  invalidated: [] as unknown[],
  cached: new Map<string, unknown>(),
  invalidateQueries(options: unknown): void {
    void mockedQueryClient.invalidated.push(options);
  },
  getQueryData(key: unknown[]): unknown {
    return mockedQueryClient.cached.get(JSON.stringify(key));
  },
  setQueryData(key: unknown[], value: unknown): void {
    mockedQueryClient.cached.set(JSON.stringify(key), value);
  },
};

export function resetMockedQueryClient(): void {
  mockedQueryClient.invalidated.length = 0;
  mockedQueryClient.cached.clear();
}
