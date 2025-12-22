import { Bag7 } from "./bag7";
import { Bag7Plus1 } from "./bag7-1";
import { Bag7Plus2 } from "./bag7-2";
import { Bag7PlusX } from "./bag7-x";
import { Bag14 } from "./bag14";
import { Classic } from "./classic";
import type { Bag } from "./core";
import { Pairs } from "./pairs";
import { Random } from "./random";

export type BagType =
  | "7-bag"
  | "14-bag"
  | "classic"
  | "pairs"
  | "total mayhem"
  | "7+1-bag"
  | "7+2-bag"
  | "7+x-bag";

export const rngMap: { [k in BagType]: new (seed: number) => Bag } = {
  "7-bag": Bag7,
  "14-bag": Bag14,
  classic: Classic,
  pairs: Pairs,
  "total mayhem": Random,
  "7+1-bag": Bag7Plus1,
  "7+2-bag": Bag7Plus2,
  "7+x-bag": Bag7PlusX
};

export * from "./core";

export * from "./bag7";
export * from "./bag14";
export * from "./classic";
export * from "./pairs";
export * from "./random";
export * from "./bag7-1";
export * from "./bag7-2";
export * from "./bag7-x";
