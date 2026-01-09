export namespace polyfills {
  export class Map<K, V> {
    #entries: Array<[K, V]> = [];

    constructor(iterable?: Iterable<[K, V]>) {
      if (iterable) {
        for (const [key, value] of iterable) {
          this.set(key, value);
        }
      }
    }

    get size(): number {
      return this.#entries.length;
    }

    set = (key: K, value: V): this => {
      const index = this.#entries.findIndex(([k]) => k === key);
      if (index !== -1) {
        this.#entries[index][1] = value;
      } else {
        this.#entries.push([key, value]);
      }
      return this;
    };

    get = (key: K): V | undefined => {
      const entry = this.#entries.find(([k]) => k === key);
      return entry ? entry[1] : undefined;
    };

    has = (key: K): boolean => {
      return this.#entries.some(([k]) => k === key);
    };

    delete = (key: K): boolean => {
      const index = this.#entries.findIndex(([k]) => k === key);
      if (index !== -1) {
        this.#entries.splice(index, 1);
        return true;
      }
      return false;
    };

    clear = (): void => {
      this.#entries = [];
    };

    forEach = (
      callback: (value: V, key: K, map: Map<K, V>) => void,
      thisArg?: any
    ): void => {
      // Use a shallow copy to prevent issues if the map is modified during iteration
      const entriesCopy = this.#entries.slice();
      for (const [key, value] of entriesCopy) {
        callback.call(thisArg, value, key, this);
      }
    };

    *entries(): IterableIterator<[K, V]> {
      for (const entry of this.#entries) {
        yield entry;
      }
    }

    *keys(): IterableIterator<K> {
      for (const [key] of this.#entries) {
        yield key;
      }
    }

    *values(): IterableIterator<V> {
      for (const [, value] of this.#entries) {
        yield value;
      }
    }

    [Symbol.iterator] = function* (this: Map<K, V>) {
      yield* this.entries();
    };
  }
}
