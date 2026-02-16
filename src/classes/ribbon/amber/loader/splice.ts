export const splice = (input: string) => {
  const start =
    input.indexOf("this.self.iom.SetScoped(!0))}}") +
    "this.self.iom.SetScoped(!0))}}".length;

  const end = input.search(/class\s[a-z]{2}{/);

  const content = input.slice(start, end);

  const trace = (
    input: string,
    start: number,
    openStr = "{",
    closeStr = "}"
  ) => {
    let i = start;
    let brace = 1;
    while (brace > 0 && i < input.length) {
      if (input[i] === openStr) brace++;
      if (input[i] === closeStr) brace--;
      i++;
    }
    return i;
  };

  let libraries = input.slice(
    "(() => {\n".length,
    input.indexOf('(function(){"use strict";')
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

  const mainStart = input.search(
    /class\s+[A-Za-z]{2}\s+extends\s+[A-Za-z]\{static\s+OptionsList/
  );
  const mainName = input.slice(
    mainStart + "class ".length,
    mainStart + "class ".length + 2
  );

  const parentName = input.slice(
    mainStart + "class ge extends ".length,
    mainStart + "class ge extends ".length + 1
  );

  const parentStart = input.search(
    new RegExp(
      `class ${parentName}\\{constructor\\((.)\\)\\{this\\.self=\\1\\}`
    )
  );
  const parentEnd = trace(input, parentStart + "class k{".length);
  const parentBody = input.slice(parentStart, parentEnd);

  const zenithStaticStart = input.search(
    new RegExp(
      `class [A-Za-z]{2} extends ${parentName}\\{\\s*static FloorDistance`
    )
  );
  const zenithStaticEnd = input.indexOf(
    "static GetSpeedCap(",
    zenithStaticStart
  );
  const zenithStaticBody =
    input.slice(zenithStaticStart, zenithStaticEnd) + "}";

  const bagStart = input.search(
    new RegExp(`class [A-Za-z]{1} extends ${parentName}\\{\\s*static BagList`)
  );

  const bagEnd = trace(input, bagStart + "class F extends k{".length);
  let bagBody = input.slice(bagStart, bagEnd);
  bagBody = bagBody.slice(0, bagBody.indexOf("];") + 2) + "}";

  const counterStart = input.search(
    new RegExp(
      `class [A-Za-z]{1} extends ${parentName}\\{\\s*static DisplayCounters`
    )
  );
  const counterEnd = trace(input, counterStart + "class O extends k{".length);
  let counterBody = input.slice(counterStart, counterEnd);
  const counterEndStr = "Object.keys(this.DisplayCounters);";
  counterBody =
    counterBody.slice(
      0,
      counterBody.indexOf(counterEndStr) + counterEndStr.length
    ) + "}";

  const engineStart = input.search(
    new RegExp(
      `class [A-Za-z$]{1} extends ${parentName}\\{\\s*static init\\(\\)\\{this\\.ROTATION_LEFT=1`
    )
  );
  const engineName = input.slice(
    engineStart + "class ".length,
    engineStart + "class ".length + 1
  );
  const engineEnd = trace(
    input,
    engineStart + "class H extends k{static init(){".length
  );
  const engineBody =
    input.slice(engineStart, engineEnd) + "}" + engineName + ".init();";

  const constantsStart = input.indexOf("={minotypes:") - 7;
  const constantsEnd = trace(
    input,
    constantsStart + "const w={minotypes:".length
  );
  const constantsBody = input.slice(constantsStart, constantsEnd) + ";";

  const cacheNameStart = input.search(/\b[a-zA-Z]\.cached=\{\}/);
  const cacheName = input.slice(cacheNameStart, cacheNameStart + 1);
  const cacheBody = `function ${cacheName}(e){const t=Object.prototype.toString.call(e);return ${cacheName}.cached[t]?${cacheName}.cached[t]:(${cacheName}.cached[t]=t.substring(8,t.length-1).toLowerCase());}${cacheName}.cached={};`;

  const versionString = "version:{default:";
  const versionStart = input.indexOf(versionString, mainStart);
  const versionVar =
    "const " +
    input.slice(
      versionStart + versionString.length,
      versionStart + versionString.length + 1
    ) +
    "=11;";

  const version2String = 'gameModes:{"40l":{version:';
  const version2Start = input.indexOf(version2String);
  const version2Var =
    "const " +
    input.slice(
      version2Start + version2String.length,
      version2Start + version2String.length + 1
    ) +
    "=19;";

  const spinRulesStart = input.indexOf(".SpinRules=[") - 2;
  const spinRulesName = input.slice(spinRulesStart, spinRulesStart + 2);
  const spinRulesBody =
    "class " +
    spinRulesName +
    "{}" +
    input.slice(spinRulesStart, input.indexOf("];", spinRulesStart) + 2);

  const mainBody =
    input
      .slice(mainStart, start)
      .slice(0, input.slice(mainStart, start).indexOf("constructor")) +
    "}" +
    mainName +
    ".init();";

  const utils =
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
    mainBody;

  return {
    libraries,
    parentBody,
    versionVar,
    version2Var,
    zenithStaticBody,
    bagBody,
    counterBody,
    cacheBody,
    constantsBody,
    spinRulesBody,
    engineBody,
    mainBody,
    utils,
    amadeus: content
  };
};
