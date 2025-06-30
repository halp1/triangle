import { version } from "../../../utils";
import { basic } from "../../../utils/api/basic";
import { type Server } from "../../../utils/api/server";

import fsSync from "node:fs";
import fs from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import chalk from "chalk";

let Amadeus: Awaited<ReturnType<typeof tetoPack>> | null = null;

const log = (
  msg: string,
  { level = "info" }: { level: "info" | "warning" | "error" } = {
    level: "info"
  }
) => {
  const func =
    level === "info"
      ? chalk.blue
      : level === "warning"
        ? chalk.yellow
        : chalk.red;
  console.log(`${func("[🎀\u2009Ribbon]")}: ${msg}`);
};

const extractPacker = (text: string) => {
  const trace = (
    text: string,
    start: number,
    openStr = "{",
    closeStr = "}"
  ) => {
    let i = start;
    let brace = 1;
    while (brace > 0 && i < text.length) {
      if (text[i] === openStr) brace++;
      if (text[i] === closeStr) brace--;
      i++;
    }
    return i;
  };

  let libraries = text.slice(
    "(() => {\n".length,
    text.indexOf('(function(){"use strict";')
  );

  const bufferStart = libraries.indexOf("e=function(){");
  const bufferEnd =
    trace(libraries, bufferStart + "e=function(){".length) + "()".length;
  libraries =
    libraries.slice(0, bufferStart) + "e=Buffer" + libraries.slice(bufferEnd);

  const pixiStart = libraries.search(
    /[A-Za-z]{1}=function\([A-Za-z]{1}\)\{"use strict";var [A-Za-z]{1}=setTimeout;/
  );
  let pixiEnd = trace(
    libraries,
    trace(libraries, pixiStart + "e=(function(t){".length) +
      '({}),s=function(t,e,r,n,i,o,s,a){"use strict";'.length
  );
  pixiEnd = libraries.indexOf(";", pixiEnd);
  libraries =
    libraries.slice(0, pixiStart - 1) +
    libraries.slice(pixiEnd) +
    "/*LIBRARY_CUTOFF*/";
  libraries = libraries.replace("o.filters", "{}");
  const assignIndex = libraries.search(/Object\.assign\(\{\},[A-Za-z]\);/);
  libraries =
    libraries.slice(0, assignIndex) +
    libraries.slice(assignIndex + "Object.assign({},s);".length);

  const mainStart = text.search(
    /class\s+[A-Za-z]{2}\s+extends\s+[A-Za-z]\{static\s+OptionsList/
  );

  const parentName = text.slice(
    mainStart + "class ge extends ".length,
    mainStart + "class ge extends ".length + 1
  );

  const parentStart = text.search(
    new RegExp(
      `class ${parentName}\\{constructor\\((.)\\)\\{this\\.self=\\1\\}`
    )
  );
  const parentEnd = trace(text, parentStart + "class k{".length);
  const parentBody = text.slice(parentStart, parentEnd);

  const zenithStaticStart = text.search(
    new RegExp(
      `class [A-Za-z]{2} extends ${parentName}\\{\\s*static FloorDistance`
    )
  );
  const zenithStaticEnd = text.indexOf(
    "static GetSpeedCap(",
    zenithStaticStart
  );
  const zenithStaticBody = text.slice(zenithStaticStart, zenithStaticEnd) + "}";

  const bagStart = text.search(
    new RegExp(`class [A-Za-z]{1} extends ${parentName}\\{\\s*static BagList`)
  );

  const bagEnd = trace(text, bagStart + "class F extends k{".length);
  let bagBody = text.slice(bagStart, bagEnd);
  bagBody = bagBody.slice(0, bagBody.indexOf("];") + 2) + "}";

  const counterStart = text.search(
    new RegExp(
      `class [A-Za-z]{1} extends ${parentName}\\{\\s*static DisplayCounters`
    )
  );
  const counterEnd = trace(text, counterStart + "class O extends k{".length);
  let counterBody = text.slice(counterStart, counterEnd);
  const counterEndStr = "Object.keys(this.DisplayCounters);";
  counterBody =
    counterBody.slice(
      0,
      counterBody.indexOf(counterEndStr) + counterEndStr.length
    ) + "}";

  const engineStart = text.search(
    new RegExp(
      `class [A-Za-z]{1} extends ${parentName}\\{\\s*static init\\(\\)\\{this\\.ROTATION_LEFT=1`
    )
  );
  const engineName = text.slice(
    engineStart + "class ".length,
    engineStart + "class ".length + 1
  );
  const engineEnd = trace(
    text,
    engineStart + "class H extends k{static init(){".length
  );
  const engineBody =
    text.slice(engineStart, engineEnd) + "}" + engineName + ".init();";

  const constantsStart = text.indexOf("={minotypes:") - 7;
  const constantsEnd = trace(
    text,
    constantsStart + "const w={minotypes:".length
  );
  const constantsBody = text.slice(constantsStart, constantsEnd) + ";";

  const cacheBody = `function b(e){const t=Object.prototype.toString.call(e);return b.cached[t]?b.cached[t]:(b.cached[t] = t.substring(8, t.length - 1).toLowerCase());}b.cached={};`;

  const versionString = "version:{default:";
  const versionStart = text.indexOf(versionString, mainStart);
  const versionVar =
    "const " +
    text.slice(
      versionStart + versionString.length,
      versionStart + versionString.length + 1
    ) +
    "=11;";
  const version2String = 'gameModes:{"40l":{version:';
  const version2Start = text.indexOf(version2String);
  const version2Var =
    "const " +
    text.slice(
      version2Start + version2String.length,
      version2Start + version2String.length + 1
    ) +
    "=19;";

  const spinRulesStart = text.indexOf(".SpinRules=[") - 2;
  const spinRulesName = text.slice(spinRulesStart, spinRulesStart + 2);
  const spinRulesBody =
    "class " +
    spinRulesName +
    "{}" +
    text.slice(spinRulesStart, text.indexOf("];", spinRulesStart) + 2);

  // search for the start of obfuscation
  text = text.slice(mainStart).trim();

  // const internalName = text.slice(text.indexOf("return") + 7, text.indexOf("return") + 9);
  // const functionStart = text.indexOf("function " + internalName);
  // const functionEnd = trace(text, functionStart + "function Te(e, t){".length);
  // const functionBody = text
  //   .slice(functionStart, functionEnd)
  //   .replaceAll("\n", "")
  //   .replaceAll("  ", "")
  //   .replaceAll(" = ", "=")
  //   .replace(" () ", "()");
  // const dictName = functionBody.slice(
  //   functionBody.indexOf("const ") + 8,
  //   functionBody.indexOf("const ") + 10
  // );

  // const dictStart = text.indexOf("function " + dictName + "() {");
  // const dictEnd = trace(text, dictStart + ("function " + dictName + "() {").length);
  // const dictBody = text
  //   .slice(dictStart, dictEnd)
  //   .replaceAll("\n", "")
  //   .replaceAll("  ", "")
  //   .replaceAll(" = ", "=");

  const obfuscationEnd = text.search(/class\s[a-z]{2}{/);

  const classNameStart = text.search(/const\s+(\S{2})=new\s+class/);

  const className = text.slice(classNameStart + 6, classNameStart + 8);

  // let deobfuscator =
  //   dictBody +
  //   "\n" +
  //   functionBody +
  //   "\n" +
  //   text.slice(0, functionStart) +
  //   text.slice(functionEnd, dictStart) +
  //   text.slice(dictEnd, obfuscationEnd);
  return (
    `(() => { ` +
    libraries +
    parentBody +
    versionVar +
    version2Var +
    zenithStaticBody +
    bagBody +
    counterBody +
    cacheBody +
    constantsBody +
    spinRulesBody +
    engineBody +
    text.slice(0, obfuscationEnd) +
    `return ${className}})();`
  );
};
export const tetoPack = (
  userAgent: string,
  options: {
    global: boolean;
  } = { global: false }
): Promise<{
  encode: (msg: string, data?: any) => Buffer;
  decode: (data: Buffer) => any;
}> => {
  if (Amadeus && options.global) return Promise.resolve(Amadeus);

  return new Promise(async (resolve) => {
    const serverVersion = await basic({
      userAgent,
      token: "",
      turnstile: null
    }).get<Server.Environment>({
      uri: "server/environment"
    });
    if (serverVersion.success === false) {
      throw new Error(serverVersion.error.msg);
    }

    const triangleDir = path.join(homedir(), ".trianglejs");
    const fileName = `tetrio-${version}-${serverVersion.signature.client.build.id}.js`;

    let tetrioOverride: string;
    try {
      tetrioOverride = await fs.readFile(
        path.join(triangleDir, fileName),
        "utf-8"
      );
    } catch {
      log("TETR.IO update found. Extracting new packer...", {
        level: "warning"
      });
      if (!fsSync.existsSync(triangleDir)) {
        await fs.mkdir(triangleDir, { recursive: true });
      }

      // empty triangle folder
      const files = await fs.readdir(triangleDir);
      for (const file of files) {
        await fs.rm(path.join(triangleDir, file), {
          recursive: true,
          force: true
        });
      }

      const response = await fetch("https://tetr.io/js/tetrio.js");
      const buffer = Buffer.from(await response.arrayBuffer());
      tetrioOverride = buffer.toString();

      tetrioOverride = extractPacker(tetrioOverride);
      await fs.writeFile(path.join(triangleDir, fileName), tetrioOverride);

      log(
        `tetrio.js @${serverVersion.signature.version}-${serverVersion.signature.client.build.id} patched`
      );
    }

    const tetrio = (0, eval)(tetrioOverride);

    Amadeus = {
      encode: (msg: string, data?: any) => {
        const encoded: number[] = tetrio.Encode(msg, data).toJSON().data;
        return Buffer.from([...encoded]);
      },
      decode: (data: Buffer) => {
        const decoded = tetrio.Decode(data);
        if (decoded.command === "packets") {
          decoded.data.packets = decoded.data.packets.map((packet: any) =>
            Buffer.from([...packet])
          );
        }
        return decoded;
      }
    };
    resolve(Amadeus);
  });
};
