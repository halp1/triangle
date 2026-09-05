import * as fs from "fs";
import * as path from "path";

const out = path.join(
  import.meta.dirname,
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
