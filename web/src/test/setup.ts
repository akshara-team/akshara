/**
 * Node 26 defines a global `localStorage` that is `undefined` unless the process
 * is started with `--localstorage-file`, and it shadows the one jsdom would give
 * us. Install an in-memory Storage so the storage layer can be tested normally.
 */
class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

if (!globalThis.localStorage) {
  const shim = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: shim,
    configurable: true,
    writable: true,
  });
  if (typeof window !== "undefined" && window !== globalThis) {
    Object.defineProperty(window, "localStorage", {
      value: shim,
      configurable: true,
      writable: true,
    });
  }
}
