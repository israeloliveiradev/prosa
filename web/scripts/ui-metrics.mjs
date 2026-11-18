#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileRoot = path.resolve(__dirname, "..");
const srcDir = path.join(mobileRoot, "src");

// Parse arguments (--out <dir> --file <name>)
const args = process.argv.slice(2);
let outDir = null;
let fileName = "00-antes.json";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && args[i + 1]) {
    outDir = path.resolve(mobileRoot, args[i + 1]);
  }
  if (args[i] === "--file" && args[i + 1]) {
    fileName = args[i + 1];
  }
}

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = walkDir(srcDir);
let totalLines = 0;
const filesOver400 = [];
let apiTsLines = 0;
let hexCount = 0;
let textInputCount = 0;
let styleSheetCount = 0;
let kickerCount = 0;
let useQueryCount = 0;
let useMutationCount = 0;
let testIdCount = 0;

const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;

for (const file of files) {
  const relPath = path.relative(mobileRoot, file).replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  const lineCount = lines.length;
  totalLines += lineCount;

  if (lineCount > 400) {
    filesOver400.push({ file: relPath, lines: lineCount });
  }

  if (relPath === "src/lib/api.ts") {
    apiTsLines = lineCount;
  }

  // Hex colors outside design/ and ui/flag.tsx
  const isExcludedHex = relPath.startsWith("src/design/") || relPath === "src/ui/flag.tsx" || relPath === "src/components/shell/flag.tsx";
  if (!isExcludedHex) {
    const hexMatches = content.match(hexRegex);
    if (hexMatches) {
      hexCount += hexMatches.length;
    }
  }

  // TextInput outside ui/
  const isExcludedUi = relPath.startsWith("src/ui/");
  if (!isExcludedUi) {
    const textInputMatches = content.match(/<TextInput\b/g);
    if (textInputMatches) {
      textInputCount += textInputMatches.length;
    }
    const styleSheetMatches = content.match(/StyleSheet\.create\(/g);
    if (styleSheetMatches) {
      styleSheetCount += styleSheetMatches.length;
    }
  }

  // Kickers
  const kickerMatches = content.match(/\bkicker=/g);
  if (kickerMatches) {
    kickerCount += kickerMatches.length;
  }

  // useQuery / useMutation
  const uqMatches = content.match(/\buseQuery\(/g);
  if (uqMatches) useQueryCount += uqMatches.length;
  const umMatches = content.match(/\buseMutation\(/g);
  if (umMatches) useMutationCount += umMatches.length;

  // testID
  const tidMatches = content.match(/\btestID=/g);
  if (tidMatches) testIdCount += tidMatches.length;
}

const metrics = {
  timestamp: new Date().toISOString(),
  filesInSrc: files.length,
  totalLinesInSrc: totalLines,
  filesOver400Lines: filesOver400.sort((a, b) => b.lines - a.lines),
  linesInApiTs: apiTsLines,
  hardcodedHexCount: hexCount,
  rawTextInputCount: textInputCount,
  styleSheetCreateCount: styleSheetCount,
  kickerCount: kickerCount,
  useQueryCount: useQueryCount,
  useMutationCount: useMutationCount,
  testIdCount: testIdCount,
};

const jsonStr = JSON.stringify(metrics, null, 2);

if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, fileName);
  fs.writeFileSync(outFile, jsonStr, "utf8");
  console.log(`Saved metrics to ${outFile}`);
} else {
  console.log(jsonStr);
}
