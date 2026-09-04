/**
 * Generates `src/utils/typia/functional` from `src/utils/typia/templates`.
 *
 * typia dropped its CLI in v14 and moved transformation onto `ttsc`, which runs
 * plugins inside the type-check pass. That pass needs the whole program, so the
 * compiler emits every file it touched, not just the template. We point it at a
 * throwaway `outDir` and lift out only the template's output.
 *
 * Both the JavaScript and the declaration are taken verbatim. The declaration
 * carries `IValidation<Packet>`, which cannot be recovered by re-deriving types
 * from the emitted JavaScript, so it must survive to `dist` as-is. `functional`
 * sits at the same depth as `templates`, so its relative import of `Packet`
 * stays correct once the file moves.
 */
import * as fs from "fs";
import * as path from "path";

const pkg = path.join(import.meta.dir, "..");
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
