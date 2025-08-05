import { EventEmitter } from "..";
import type { Engine, Mino } from "../../engine";
import { Adapter } from "./core";
import type * as Messages from "./types/messages";

import chalk from "chalk";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";

export interface AdapterIOConfig {
  /** The name of the adapter. Used when logging to the terminal. */
  name: string;
  /** Whether to log all messages and non-json output to the terminal */
  verbose: boolean;
  /** The path to the binary executable. */
  path: string;
  /**
   * The environment variables to set for the child process.
   * For example, when using rust, you might set RUST_BACKTRACE=1
   */
  env: NodeJS.ProcessEnv;
  /** Any additional command-line arguments to pass tothe executable */
  args: string[];
}

/**
 * Communicates with a binary engine executable using Standard Input/Output.
 * Uses JSON messages.
 * @see {@link Messages.CustomMessageData}
 */
export class AdapterIO<
  T extends Messages.CustomMessageData
> extends Adapter<T> {
  static defaultConfig: Omit<AdapterIOConfig, "path"> = {
    name: "AdapterIO",
    verbose: false,
    env: {},
    args: []
  };

  log(
    msg: string,
    {
      force = false,
      level = "info"
    }: { force: boolean; level: "info" | "warning" | "error" } = {
      force: false,
      level: "info"
    }
  ) {
    if (!this.cfg.verbose && !force) return;
    const func =
      level === "info"
        ? chalk.blue
        : level === "warning"
          ? chalk.yellow
          : chalk.red;
    console[level === "error" ? "error" : "log"](
      `${func(`[${this.cfg.name}]`)} ${msg}`
    );
  }

  cfg: AdapterIOConfig;

  events = new EventEmitter<Messages.Incoming.EventMap<T>>();

  dead = false;
  #dataBuffer = "";

  process!: ChildProcessWithoutNullStreams;

  constructor(
    config: Partial<AdapterIOConfig> & {
      path: string;
    }
  ) {
    super();

    if (!config.path) {
      throw new Error("AdapterIO requires a path to the binary executable.");
    }

    this.cfg = {
      ...AdapterIO.defaultConfig,
      ...config
    };
  }

  #start() {
    this.process = spawn(this.cfg.path, this.cfg.args, {
      env: this.cfg.env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    this.process.stderr.on("data", (data) => {
      this.log("Error: " + data.toString(), { level: "error", force: true });
    });

    this.process.stdout.on("data", (message) => this.#handle(message));
  }

  initialize(): Promise<Messages.Incoming.Info<T>> {
    return new Promise((resolve) => {
      this.events.once("info", (info) => {
        this.log("READY");
        resolve(info);
      });

      this.#start();
    });
  }

  send(message: Messages.Outgoing.all<T>) {
    if (this.dead) return;
    this.process.stdin.write(JSON.stringify(message) + "\n");
    this.log("OUTGOING:\n" + JSON.stringify(message, null, 2));
  }

  #handle(message: string | Buffer) {
    const text = message.toString();
    this.#dataBuffer += text;

    let newlineIndex;
    while ((newlineIndex = this.#dataBuffer.indexOf("\n")) >= 0) {
      const line = this.#dataBuffer.slice(0, newlineIndex);
      this.#dataBuffer = this.#dataBuffer.slice(newlineIndex + 1);

      if (line === "") continue;

      try {
        const message = JSON.parse(line.trim());
        this.log("INCOMING:\n" + JSON.stringify(message, null, 2));
        this.events.emit(message.type, message);
      } catch {
        this.log(line);
      }
    }
  }

  config(engine: Engine, data?: T["config"]): void {
    this.send({
      type: "config",
      ...this.configFromEngine(engine),
      data
    });
  }

  update(engine: Engine, data?: T["state"]): void {
    this.send({
      type: "state",
      ...this.stateFromEngine(engine),
      data
    });
  }

  addPieces(pieces: Mino[], data?: T["pieces"]): void {
    this.send({
      type: "pieces",
      pieces,
      data
    });
  }

  play(engine: Engine, data?: T["play"]): Promise<Messages.Incoming.Move<T>> {
    this.send({
      type: "play",
      ...this.playFromEngine(engine),
      data
    });

    return new Promise((resolve) => {
      this.events.once("move", (move) => {
        resolve(move);
      });
    });
  }

  stop() {
    this.process.kill("SIGINT");
    this.events.removeAllListeners();
    this.process.removeAllListeners();
    this.process.stdout.removeAllListeners();
    this.process.stderr.removeAllListeners();
    this.process.stdin.removeAllListeners();
    this.process.unref();

    this.dead = true;
  }
}
