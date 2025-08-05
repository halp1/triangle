import fs from "node:fs";
import path from "node:path";

const packageJson = await fs.promises.readFile(
  path.join(__dirname, "../package.json"),
  "utf-8"
);
const { version } = JSON.parse(packageJson);

await fs.promises.writeFile(
  path.join(__dirname, "../src/utils/version.ts"),
  `export const version = "${version}";\n`
);

console.log("Version:", version);
