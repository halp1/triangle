import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

async function renameModuleFiles(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await renameModuleFiles(fullPath);
    } else if (entry.name.endsWith(".js")) {
      await fs.rename(fullPath, fullPath.replace(/\.js$/, ".mjs"));
    } else if (entry.name.endsWith(".js.map")) {
      await fs.rename(fullPath, fullPath.replace(/\.js\.map$/, ".mjs.map"));
    }
  }
}

await renameModuleFiles("dist");

async function rewriteImports(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await rewriteImports(fullPath);
    } else if (entry.name.endsWith(".mjs")) {
      let content = await fs.readFile(fullPath, "utf-8");

      content = content.replace(
        /from\s+["'](\.{1,2}(?:\/[^'"]+)*)["']/g,
        (match, importPath) => {
          const baseDir = path.dirname(fullPath);

          // Try file.mjs
          const filePath = path.join(baseDir, importPath + ".mjs");

          try {
            fsSync.accessSync(filePath);
            return `from "${importPath}.mjs"`;
          } catch {}

          // Try folder/index.mjs
          const indexPath = path.join(baseDir, importPath, "index.mjs");

          try {
            fsSync.accessSync(indexPath);
            return `from "${importPath}/index.mjs"`;
          } catch {}

          return match; // Leave as-is if neither exist
        }
      );

      await fs.writeFile(fullPath, content);
    }
  }
}

await rewriteImports("dist");
