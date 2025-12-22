export class EventEmitter<T extends Record<string, any>> {
  #listeners: [keyof T, (data: any) => void, boolean][];
  #maxListeners: number = 10;

  /** Enables more debugging logs for memory leaks */
  verbose = false;

  constructor() {
    this.#listeners = [];
  }

  on<K extends keyof T>(event: K, cb: (data: T[K]) => void) {
    this.#listeners.push([event, cb, false]);

    const listeners = this.#listeners.filter(([e]) => e === event);
    if (listeners.length > this.#maxListeners) {
      console.warn(
        `Max listeners exceeded for event "${String(event)}". Current: ${
          this.#listeners.filter(([e]) => e === event).length
        }, Max: ${this.#maxListeners}`
      );
      if (this.verbose)
        console.warn(
          `Trace: ${new Error().stack}\n\nListeners:\n`,
          listeners.map(([_, fn]) => fn.toString()).join("\n\n")
        );
    }
    return this;
  }

  off<K extends keyof T>(event: K, cb: (data: T[K]) => void) {
    this.#listeners = this.#listeners.filter(
      ([e, c]) => e !== event || c !== cb
    );
    return this;
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    const toRemove = new Set<number>();

    this.#listeners.forEach(([e, cb, once], idx) => {
      if (e !== event) return;
      cb(data);
      if (once) toRemove.add(idx);
    });

    this.#listeners = this.#listeners.filter((_, idx) => !toRemove.has(idx));

    return this;
  }

  once<K extends keyof T>(event: K, cb: (data: T[K]) => any | Promise<any>) {
    this.#listeners.push([event, cb, true]);

    return this;
  }

  removeAllListeners<K extends keyof T>(event?: K) {
    if (event) {
      this.#listeners = this.#listeners.filter(([e]) => e !== event);
    } else {
      this.#listeners = [];
    }
  }

  set maxListeners(n: number) {
    if (n <= 0 || !Number.isInteger(n)) {
      throw new RangeError("Max listeners must be a positive integer");
    }

    this.#maxListeners = n;
  }

  get maxListeners() {
    return this.#maxListeners;
  }

  export() {
    return {
      listeners: this.#listeners.map(([event, cb, once]) => ({
        event,
        cb,
        once
      })),
      maxListeners: this.#maxListeners,
      verbose: this.verbose
    };
  }

  import(data: ReturnType<EventEmitter<T>["export"]>) {
    data.listeners.forEach(({ event, cb, once }) => {
      if (once) {
        this.once(event, cb as any);
      } else {
        this.on(event, cb as any);
      }
    });
    this.#maxListeners = data.maxListeners;
    this.verbose = data.verbose;
    return this;
  }
}
