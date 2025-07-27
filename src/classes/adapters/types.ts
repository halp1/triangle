import type { BoardSquare, EngineInitializeParams, Mino } from "../../engine";

export namespace messages {
  export interface CustomMessageData {
    config: null;
    state: null;
  }

  export namespace incoming {
    export interface Info {
      type: "info";
      name: string;
      version: string;
      author: string;
    }
  }

  export namespace outgoing {
    export interface Config<Data extends CustomMessageData> {
      type: "config";
      game: EngineInitializeParams;
      data: Data["config"];
    }

    export interface State<Data extends CustomMessageData> {
      type: "state";

      board?: BoardSquare[][];

      current: Mino;
      hold: Mino | null;
      queue: Mino[];

      garbage: number[];

      combo: number;
      b2b: number;

      data: Data["state"];
    }
  }
}
