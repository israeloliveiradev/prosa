#!/usr/bin/env node
/**
 * Relatório de textos de interface escritos direto no JSX (fora das tabelas de i18n).
 *
 * Como rodar (de dentro de mobile/):
 *   node scripts/check-hardcoded-strings.mjs            # relatório por arquivo, sai com 0
 *   node scripts/check-hardcoded-strings.mjs --strict   # sai com 1 se encontrar qualquer texto
 *   node scripts/check-hardcoded-strings.mjs --summary  # só o resumo e a contagem por arquivo
 *   node scripts/check-hardcoded-strings.mjs --json     # saída em JSON
 *   node scripts/check-hardcoded-strings.mjs --all      # todo .tsx de src/, não só os vivos
 *   node scripts/check-hardcoded-strings.mjs --live     # lista os .tsx vivos e sai
 *
 * "Vivo" = alcançável por imports a partir de src/app/** (as rotas do Expo Router).
 * O script usa o compilador TypeScript de mobile/node_modules (só parse, sem typecheck) e acusa:
 *   - texto JSX com letras: <Text>Começar</Text>
 *   - literal de string/template dentro de {…} no JSX, inclusive em `?:`, `??` e `||`
 *   - atributos de texto com literal: title, placeholder, accessibilityLabel, accessibilityHint,
 *     aria-label, alt, label
 * Fica de fora o que não tem letras (símbolos, números) e a allowlist abaixo (marca "Prosa",
 * níveis CEFR, códigos de idioma, endônimos como "Deutsch", nomes do elenco).
 * Para silenciar um caso legítimo, ponha `i18n-ignore` num comentário na mesma linha ou na anterior.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const APP = path.join(SRC, "app");

const args = new Set(process.argv.slice(2));
const STRICT = args.has("--strict");
const JSON_OUT = args.has("--json");
const SCAN_ALL = args.has("--all");
const SUMMARY = args.has("--summary");
const LIST_LIVE = args.has("--live");

const CODE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];
const PLATFORM_SUFFIXES = ["", ".web", ".native", ".ios", ".android"];
const TEXT_ATTRIBUTES = new Set([
  "title",
  "placeholder",
  "accessibilityLabel",
  "accessibilityHint",
  "aria-label",
  "alt",
  "label",
]);

/** Palavras que podem aparecer sem tradução: marca, siglas, níveis, endônimos, elenco. */
const ALLOWED_WORDS = new Set([
  "Prosa",
  "Pro",
  "Score",
  "FSRS",
  "UTC",
  "CEFR",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "English",
  "Português",
  "Brasil",
  "Deutsch",
  "Français",
  "Español",
  "Italiano",
  "日本語",
  "Русский",
  "Einstein",
  "Curie",
  "Feynman",
  "Leonardo",
  "Kokoro",
  "Piper",
]);

/** Códigos de idioma em caixa alta ("EN", "PT") e notações de nível ("A2+"). */
const ALLOWED_TOKEN = /^(?:[A-Z]{2}|[ABC][12]\+?)$/;
const HAS_LETTER = /\p{L}/u;

function isAllowed(text) {
  const rest = text
    .split(/[^\p{L}\p{N}+]+/u)
    .filter(Boolean)
    .filter((word) => !ALLOWED_WORDS.has(word) && !ALLOWED_TOKEN.test(word));
  return !rest.some((word) => HAS_LETTER.test(word));
}

function exists(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (CODE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) && !entry.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

/** Todas as variantes de plataforma que existem para um import ("x" → x.tsx, x.web.tsx, x/index.ts…). */
function resolveImport(fromFile, specifier) {
  let base;
  if (specifier.startsWith("@/assets/")) {
    base = path.join(ROOT, "assets", specifier.slice("@/assets/".length));
  } else if (specifier.startsWith("@/")) {
    base = path.join(SRC, specifier.slice(2));
  } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return [];
  }
  if (CODE_EXTENSIONS.some((ext) => base.endsWith(ext)) && exists(base)) {
    return [base];
  }
  const found = [];
  for (const stem of [base, path.join(base, "index")]) {
    for (const suffix of PLATFORM_SUFFIXES) {
      for (const ext of CODE_EXTENSIONS) {
        const candidate = `${stem}${suffix}${ext}`;
        if (exists(candidate)) {
          found.push(candidate);
        }
      }
    }
    if (found.length > 0) {
      break;
    }
  }
  return found;
}

function parse(file) {
  const text = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") || file.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
}

function importsOf(source) {
  const specifiers = [];
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!node.importClause?.isTypeOnly) {
        specifiers.push(node.moduleSpecifier.text);
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!node.isTypeOnly) {
        specifiers.push(node.moduleSpecifier.text);
      }
    } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      const callee = node.expression;
      if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === "require")) {
        specifiers.push(node.arguments[0].text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

/** Arquivos alcançáveis a partir das rotas em src/app. */
function liveFiles() {
  const queue = walk(APP);
  const seen = new Set(queue);
  while (queue.length > 0) {
    const file = queue.shift();
    let source;
    try {
      source = parse(file);
    } catch {
      continue;
    }
    for (const specifier of importsOf(source)) {
      for (const target of resolveImport(file, specifier)) {
        if (!seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }
  }
  return [...seen];
}

function isIgnored(source, node) {
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  const lines = source.text.split(/\r?\n/);
  return [lines[line], lines[line - 1]].some((text) => text?.includes("i18n-ignore"));
}

/** Literais de texto dentro de uma expressão JSX: direto, em `?:`, `??`, `||`, `&&` e parênteses. */
function literalParts(expression, out = []) {
  if (!expression) {
    return out;
  }
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    out.push({ node: expression, text: expression.text });
  } else if (ts.isTemplateExpression(expression)) {
    const text = [expression.head.text, ...expression.templateSpans.map((span) => span.literal.text)].join(" ");
    out.push({ node: expression, text });
  } else if (ts.isParenthesizedExpression(expression)) {
    literalParts(expression.expression, out);
  } else if (ts.isConditionalExpression(expression)) {
    literalParts(expression.whenTrue, out);
    literalParts(expression.whenFalse, out);
  } else if (ts.isBinaryExpression(expression)) {
    const op = expression.operatorToken.kind;
    if (
      op === ts.SyntaxKind.QuestionQuestionToken ||
      op === ts.SyntaxKind.BarBarToken ||
      op === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      literalParts(expression.left, out);
      literalParts(expression.right, out);
    }
  }
  return out;
}

function clean(text) {
  return text.replace(/\s+/g, " ").trim();
}

function findingsIn(file) {
  const source = parse(file);
  const found = [];
  const add = (node, kind, rawText) => {
    const text = clean(rawText);
    if (!text || !HAS_LETTER.test(text) || isAllowed(text) || isIgnored(source, node)) {
      return;
    }
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
    found.push({ line: line + 1, column: character + 1, kind, text });
  };
  const visit = (node) => {
    if (ts.isJsxText(node)) {
      add(node, "jsx-text", node.text);
    } else if (ts.isJsxExpression(node) && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      for (const part of literalParts(node.expression)) {
        add(part.node, "jsx-expression", part.text);
      }
    } else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(source);
      if (TEXT_ATTRIBUTES.has(name) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) {
          add(node.initializer, `attr:${name}`, node.initializer.text);
        } else if (ts.isJsxExpression(node.initializer)) {
          for (const part of literalParts(node.initializer.expression)) {
            add(part.node, `attr:${name}`, part.text);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

const relative = (file) => path.relative(ROOT, file).split(path.sep).join("/");

const live = SCAN_ALL ? walk(SRC) : liveFiles();
const targets = live.filter((file) => file.endsWith(".tsx")).sort();

if (LIST_LIVE) {
  for (const file of targets) {
    console.log(relative(file));
  }
  console.log(`\n${targets.length} arquivos .tsx vivos (de ${live.length} módulos alcançáveis a partir de src/app).`);
  process.exit(0);
}

const report = [];
for (const file of targets) {
  const findings = findingsIn(file);
  if (findings.length > 0) {
    report.push({ file: relative(file), findings });
  }
}
const total = report.reduce((sum, entry) => sum + entry.findings.length, 0);

if (JSON_OUT) {
  console.log(JSON.stringify({ scanned: targets.length, files: report.length, total, report }, null, 2));
} else {
  const ranked = [...report].sort((a, b) => b.findings.length - a.findings.length || a.file.localeCompare(b.file));
  for (const entry of ranked) {
    console.log(`${entry.file}  (${entry.findings.length})`);
    if (SUMMARY) {
      continue;
    }
    for (const finding of entry.findings) {
      const shown = finding.text.length > 90 ? `${finding.text.slice(0, 87)}...` : finding.text;
      console.log(`  ${String(finding.line).padStart(4)}:${String(finding.column).padEnd(3)} ${finding.kind.padEnd(26)} ${JSON.stringify(shown)}`);
    }
  }
  const scope = SCAN_ALL ? "em src/" : "vivos (alcançáveis a partir de src/app)";
  console.log(
    `\nResumo: ${total} texto(s) fixo(s) em ${report.length} de ${targets.length} arquivos .tsx ${scope}.` +
      (total > 0 && !STRICT ? " Use --strict para falhar com código 1." : ""),
  );
}

process.exit(STRICT && total > 0 ? 1 : 0);
