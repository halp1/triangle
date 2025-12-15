export * from "./damageCalc";
export * from "./increase";
export * from "./kicks";
export * from "./tetromino";
export * from "./seed";
export * from "./polyfills";
export * from "./rng";

export interface Handler<T> {
  type: new (...args: any[]) => T;
  copy: (value: T) => T;
}

export function deepCopy<T>(obj: T): T;
export function deepCopy<T, H extends readonly Handler<any>[]>(
  obj: T,
  handlers: H
): T;
export function deepCopy<T>(obj: T, handlers?: readonly Handler<any>[]): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (handlers !== undefined) {
    for (let i = 0, n = handlers.length; i < n; i++) {
      const h = handlers[i];
      if (obj instanceof h.type) {
        return h.copy(obj);
      }
    }
  }

  if (Array.isArray(obj)) {
    const arr = obj as unknown as any[];
    const len = arr.length;
    const out = new Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = deepCopy(arr[i], handlers as any);
    }
    return out as unknown as T;
  }

  const src = obj as Record<string, any>;
  const out: Record<string, any> = {};

  for (const k in src) {
    // faster than Object.keys + indexing
    if (Object.prototype.hasOwnProperty.call(src, k)) {
      out[k] = deepCopy(src[k], handlers as any);
    }
  }

  return out as T;
}
