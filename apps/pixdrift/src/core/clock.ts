export function systemClock() {
  return {
    nowIso(): string {
      return new Date().toISOString();
    },
  };
}

