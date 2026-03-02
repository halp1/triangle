import { bitsText } from "./amber/loader/bits-text";
import { Buffer } from "buffer/index.js";

export const Bits = (0, eval)(`((Buffer) => {${bitsText}return Bits;})`)(
  Buffer
);
