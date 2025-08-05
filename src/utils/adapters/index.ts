import * as AdapterIO from "./adapter-io";
import * as Core from "./core";
import * as _Types from "./types";

export namespace adapters {
  export import IO = AdapterIO.AdapterIO;
  export import Adapter = Core.Adapter;

  export import Types = _Types;
}

export { AdapterIO };
