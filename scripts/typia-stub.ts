/**
 * Seeds a placeholder `src/utils/typia/functional` so the `ttsc` pass can run.
 *
 * `templates/index.ts` needs `Packet` from `classes/ribbon`, and `classes/ribbon`
 * imports `validateIncomingMessage` back out of `functional` — the very thing the
 * pass is about to generate, and which `bun clean` has just removed. typia's old
 * CLI sidestepped this because it never built a whole program; `ttsc` runs the
 * transform inside the type-check, so the cycle has to resolve before it starts.
 *
 * The declaration below is the signature `typia.createValidateEquals<Packet>()`
 * emits. `scripts/typia-emit.ts` deletes this directory and drops the real
 * generated pair in its place, so nothing here reaches `dist`.
 */
import * as fs from "fs";
import * as path from "path";

const out = path.join(
  import.meta.dir,
  "..",
  "src",
  "utils",
  "typia",
  "functional"
);

fs.mkdirSync(out, { recursive: true });

fs.writeFileSync(
  path.join(out, "index.d.ts"),
  `import type { Packet } from "../../../classes/ribbon";
import typia from "typia";
export declare const validateIncomingMessage: ((input: unknown) => typia.IValidation<Packet>) & typia.StandardSchemaV1<Packet, Packet>;
`
);
