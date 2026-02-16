import chalk from "chalk";

export type LogLevel = "info" | "warning" | "error" | "success" | "progress";

export class Logger {
  #name: string;
  #lastProgress = false;

  constructor(name: string) {
    this.#name = name;
  }

  #log(level: LogLevel, newline: boolean = true, ...messages: any[]) {
    const func =
      level === "info"
        ? chalk.blue
        : level === "warning"
          ? chalk.yellow
          : level === "success"
            ? chalk.greenBright
            : level === "progress"
              ? chalk.magenta
              : chalk.red;

    const output = `${func(`[${this.#name}]`)} ${messages
      .map((m) => (typeof m === "string" ? m : JSON.stringify(m)))
      .join(" ")}`;

    if (newline) {
      console.log(`${this.#lastProgress ? "\n" : ""}${output}`);
      this.#lastProgress = false;
    } else {
      process.stdout.write(`${this.#lastProgress ? "\r" : ""}${output}`);
      this.#lastProgress = true;
    }
  }

  log(...messages: any[]) {
    this.#log("info", true, ...messages);
  }

  info(...messages: any[]) {
    this.#log("info", true, ...messages);
  }

  warn(...messages: any[]) {
    this.#log("warning", true, ...messages);
  }

  error(...messages: any[]) {
    this.#log("error", true, ...messages);
  }

  success(...messages: any[]) {
    this.#log("success", true, ...messages);
  }

  progress(message: string, progress: number) {
    const cols = process.stdout.columns || 80;
    const namePlain = `[${this.#name}]`;
    const prefixPlain = `${namePlain} ${message}`;

    const contentPlain =
      prefixPlain.length >= cols
        ? prefixPlain.slice(0, cols)
        : prefixPlain + " ".repeat(cols - prefixPlain.length);

    const p = Math.max(0, Math.min(1, progress));
    const filledLength = Math.round(p * cols);

    const nameLen = namePlain.length;
    const nameFilledOverlap = Math.max(0, Math.min(filledLength, nameLen));
    const nameEmptyOverlap = Math.max(0, nameLen - nameFilledOverlap);

    const filledRaw = contentPlain.slice(0, filledLength);
    const emptyRaw = contentPlain.slice(filledLength);

    let filledRendered = "";
    if (filledLength > 0) {
      if (nameFilledOverlap > 0) {
        const namePart = filledRaw.slice(0, nameFilledOverlap);
        const rest = filledRaw.slice(nameFilledOverlap);
        filledRendered = chalk.bgWhite.magenta(namePart) + chalk.bgWhite(rest);
      } else {
        filledRendered = chalk.bgWhite(filledRaw);
      }
    }

    let emptyRendered = "";
    if (emptyRaw.length > 0) {
      if (nameEmptyOverlap > 0) {
        const namePart = emptyRaw.slice(0, nameEmptyOverlap);
        const rest = emptyRaw.slice(nameEmptyOverlap);
        emptyRendered = chalk.magenta(namePart) + rest;
      } else {
        emptyRendered = emptyRaw;
      }
    }

    process.stdout.write("\r" + filledRendered + emptyRendered);
    this.#lastProgress = true;
  }
}
