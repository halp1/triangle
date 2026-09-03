import type { EventEmitter } from "../../utils";

export class Hook<T extends Record<string, any>> {
  #emitter: EventEmitter<T>;
  #listeners: [keyof T, (data: any) => void][] = [];

  constructor(emitter: EventEmitter<T>) {
    this.#emitter = emitter;
  }

  on<K extends keyof T>(event: K, cb: (data: T[K]) => void) {
    this.#emitter.on(event, cb);
    this.#listeners.push([event, cb]);
    return this;
  }

  once<K extends keyof T>(event: K, cb: (data: T[K]) => void) {
    this.#emitter.once(event, cb);
    this.#listeners.push([event, cb]);
    return this;
  }

  off<K extends keyof T>(event: K, cb: (data: T[K]) => void) {
    this.#emitter.off(event, cb);
    this.#listeners = this.#listeners.filter(
      ([e, c]) => e !== event || c !== cb
    );
    return this;
  }

  destroy() {
    this.#listeners.forEach(([event, cb]) => {
      this.#emitter.off(event, cb);
    });
    this.#listeners = [];
  }
}
