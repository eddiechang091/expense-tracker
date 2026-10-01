import { connectAnna } from "./runtime";
import type { AnnaClient } from "./runtime";
import { APP_NAMESPACE } from "@/lib/constants";

const MAX_VALUE_BYTES = 262144;

export interface KvStore {
  readonly kind: "anna" | "local";
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

function withPrefix(key: string): string {
  return APP_NAMESPACE + ":" + key;
}

function unwrapResult(result: unknown): unknown {
  if (result && typeof result === "object") {
    const record = result as Record<string, unknown>;
    if ("result" in record) return record.result;
    if ("data" in record) return record.data;
    if ("value" in record) return record.value;
  }
  return result;
}

function decode<T>(raw: unknown): T | null {
  let value = unwrapResult(raw);
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  value = unwrapResult(value);
  if (value === null || value === undefined) return null;
  return value as T;
}

let writeChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(op: () => Promise<T>): Promise<T> {
  const next = writeChain.then(op, op);
  writeChain = next.catch(() => undefined);
  return next;
}

export function safeLocalStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      // Probe once per access: some embedded contexts expose the object but
      // throw on read/write. Fall back to the in-memory map in that case.
      window.localStorage.getItem("__anna_probe__");
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

class LocalStore implements KvStore {
  readonly kind = "local" as const;
  private memory = new Map<string, string>();

  private read(key: string): string | null {
    const ls = safeLocalStorage();
    if (ls) {
      try {
        return ls.getItem(key);
      } catch {
        return this.memory.has(key) ? (this.memory.get(key) as string) : null;
      }
    }
    return this.memory.has(key) ? (this.memory.get(key) as string) : null;
  }

  private write(key: string, value: string): void {
    const ls = safeLocalStorage();
    if (ls) {
      try {
        ls.setItem(key, value);
        return;
      } catch {
        this.memory.set(key, value);
        return;
      }
    }
    this.memory.set(key, value);
  }

  private drop(key: string): void {
    const ls = safeLocalStorage();
    if (ls) {
      try {
        ls.removeItem(key);
        return;
      } catch {
        this.memory.delete(key);
        return;
      }
    }
    this.memory.delete(key);
  }

  async get<T>(key: string): Promise<T | null> {
    return decode<T>(this.read(withPrefix(key)));
  }

  async set<T>(key: string, value: T): Promise<void> {
    return enqueue(async () => {
      this.write(withPrefix(key), JSON.stringify(value));
    });
  }

  async remove(key: string): Promise<void> {
    return enqueue(async () => {
      this.drop(withPrefix(key));
    });
  }

  async keys(): Promise<string[]> {
    return [];
  }
}

class AnnaStore implements KvStore {
  readonly kind = "anna" as const;

  constructor(private readonly client: AnnaClient) {}

  async get<T>(key: string): Promise<T | null> {
    const res = await this.client.storage?.get?.({ key: withPrefix(key) });
    return decode<T>(res);
  }

  async set<T>(key: string, value: T): Promise<void> {
    return enqueue(async () => {
      const payload = JSON.stringify(value);
      if (payload.length > MAX_VALUE_BYTES) {
        console.warn("[storage] value exceeds the safe Anna Storage size: " + key);
      }
      await this.client.storage?.set?.({ key: withPrefix(key), value: payload });
    });
  }

  async remove(key: string): Promise<void> {
    return enqueue(async () => {
      await this.client.storage?.delete?.({ key: withPrefix(key) });
    });
  }

  async keys(): Promise<string[]> {
    const res = await this.client.storage?.list?.({});
    const unwrapped = unwrapResult(res);
    const list = Array.isArray(unwrapped) ? unwrapped : [];
    return list
      .map((item) => String(item))
      .filter((item) => item.indexOf(APP_NAMESPACE + ":") === 0)
      .map((item) => item.slice(APP_NAMESPACE.length + 1));
  }
}

let cachedStore: Promise<KvStore> | null = null;

export function getKvStore(): Promise<KvStore> {
  if (cachedStore) return cachedStore;
  cachedStore = (async () => {
    const runtime = await connectAnna();
    if (runtime.state === "connected" && runtime.client && runtime.client.storage) {
      return new AnnaStore(runtime.client);
    }
    return new LocalStore();
  })();
  return cachedStore;
}

export function resetKvStore(): void {
  cachedStore = null;
}