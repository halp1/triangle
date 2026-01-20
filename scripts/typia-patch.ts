import * as fs from "fs";
import * as path from "path";

const targetDir = path.join(__dirname, "../src/utils/typia/functional");

function addTsNoCheckToFile(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf-8");

  if (content.startsWith("// @ts-nocheck")) {
    return;
  }

  const newContent = "// @ts-nocheck\n" + content;
  fs.writeFileSync(filePath, newContent, "utf-8");
}

function processDirectory(dirPath: string): void {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      addTsNoCheckToFile(filePath);
    }
  }
}

if (fs.existsSync(targetDir)) {
  processDirectory(targetDir);
} else {
  console.error(`Directory not found: ${targetDir}`);
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}
