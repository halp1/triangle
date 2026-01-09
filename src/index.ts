import { version } from "./utils";

import chalk from "chalk";

export { CH, ch, ChannelAPI } from "./channel";
export * as Utils from "./utils";
export * as Types from "./types";
export { Client } from "./classes";
export * as Classes from "./classes";
export * as Engine from "./engine";
export { version } from "./utils";

const suppressKey = "TRIANGLE_VERSION_SUPPRESS";
const MIGRATION_GUIDE_URL =
  "https://triangle.haelp.dev/documents/Migration.html";

type Semver = { major: number; minor: number; patch: number };

const parseSemver = (v: string): Semver => {
  const [major = 0, minor = 0, patch = 0] = v.split(".").map(Number);
  return { major, minor, patch };
};

const isNewer = (a: Semver, b: Semver) =>
  a.major > b.major ||
  (a.major === b.major && a.minor > b.minor) ||
  (a.major === b.major && a.minor === b.minor && a.patch > b.patch);

if (typeof process !== "undefined" && !(suppressKey in process.env)) {
  fetch("https://registry.npmjs.org/@haelp/teto")
    .then((r) => r.json())
    .then((d: any) => {
      const latest = d["dist-tags"].latest;

      const currentV = parseSemver(version);
      const latestV = parseSemver(latest);

      if (!isNewer(latestV, currentV)) return;

      if (latestV.major > currentV.major) {
        console.log(
          `${chalk.redBright("[Triangle.js]")}: Your triangle.js version (${version}) is ${chalk.bold(
            "one or more major versions behind"
          )} the latest release (${latest}).\n` +
            `This update includes breaking changes.\n` +
            `Migration guide: ${chalk.cyan(MIGRATION_GUIDE_URL)}\n\n` +
            `To suppress this warning, set the ${suppressKey} environment variable.`
        );
      } else {
        console.log(
          `${chalk.redBright("[Triangle.js]")}: Your triangle.js is out of date (${version} vs ${latest}). ` +
            `We recommend updating with 'npm install @haelp/teto@latest'.\n` +
            `To suppress this warning, set the ${suppressKey} environment variable.`
        );
      }
    })
    .catch(() => {
      /* fail silently */
    });
}
