export class RNG {
  static readonly #MODULUS: number = 2147483647;
  static readonly #MULTIPLIER: number = 16807;
  static readonly #MAX_FLOAT: number = 2147483646;

  #value: number;

  index = 0;

  constructor(seed: number) {
    this.#value = seed % RNG.#MODULUS;

    if (this.#value <= 0) {
      this.#value += RNG.#MAX_FLOAT;
    }

    this.next = this.next.bind(this);
    this.nextFloat = this.nextFloat.bind(this);
    this.shuffleArray = this.shuffleArray.bind(this);
    this.updateFromIndex = this.updateFromIndex.bind(this);
    this.clone = this.clone.bind(this);
  }

  next(): number {
    this.index++;
    return (this.#value = (RNG.#MULTIPLIER * this.#value) % RNG.#MODULUS);
  }

  nextFloat(): number {
    return (this.next() - 1) / RNG.#MAX_FLOAT;
  }

  shuffleArray<T extends any[]>(array: T): T {
    if (array.length === 0) {
      return array;
    }

    for (let i = array.length - 1; i !== 0; i--) {
      const r = Math.floor(this.nextFloat() * (i + 1));
      [array[i], array[r]] = [array[r], array[i]];
    }

    return array;
  }

  get seed() {
    return this.#value;
  }

  set seed(value: number) {
    this.#value = value % RNG.#MODULUS;

    if (this.#value <= 0) {
      this.#value += RNG.#MAX_FLOAT;
    }
  }

  updateFromIndex(index: number) {
    while (this.index < index) {
      this.next();
    }
  }

  clone() {
    return new RNG(this.#value);
  }
}
