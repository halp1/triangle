import { version } from "./utils";

import chalk from "chalk";

export { CH, ch, ChannelAPI } from "./channel";
export * as Utils from "./utils";
export * as Types from "./types";
export { Client } from "./classes";
export * as Classes from "./classes";
export * as Engine from "./engine";
export {version} from './utils'

const suppressKey = "TRIANGLE_VERSION_SUPPRESS";
if (typeof process !== "undefined" && !(suppressKey in process.env)) {
  fetch("https://registry.npmjs.org/@haelp/teto")
    .then((r) => r.json())
    .then((d: any) => {
      if (version < d["dist-tags"].latest)
        console.log(
          `${chalk.redBright("[Triangle.js]")} Your triangle.js is out of date (v${version} vs v${d["dist-tags"].latest}). We recommend updating with 'npm install @haelp/teto@latest'.\nTo suppress this warning, set the ${suppressKey} environment variable.`
        );
    });
}
