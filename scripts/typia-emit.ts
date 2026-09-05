import * as fs from "fs";
import * as path from "path";

const pkg = path.join(import.meta.dirname, "..");
const build = path.join(pkg, ".typia-build");
const emitted = path.join(build, "utils", "typia", "templates");
const out = path.join(pkg, "src", "utils", "typia", "functional");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of ["index.js", "index.d.ts"]) {
  const src = path.join(emitted, file);
  if (!fs.existsSync(src)) {
    console.error(`expected ${file} in the typia emit at ${emitted}`);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(out, file));
}

fs.rmSync(build, { recursive: true, force: true });
