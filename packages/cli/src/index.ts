#!/usr/bin/env bun
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { decodeTheme } from "@tsup-system/core";
import { generateTheme } from "@tsup-system/core";
import { generateThemeFiles } from "@tsup-system/core";
import { generateFontsCss } from "@tsup-system/core";

function usage(): string {
  return `tsup-system — Design System Builder CLI

Usage:
  bunx tsup-system --theme="<payload>" [--out <dir>]

Options:
  --theme="<payload>"   Required. Versioned compressed Base64URL theme payload.
  --out <dir>           Output directory (default: ./theme).
  -h, --help            Show this help.
`;
}

function parseArgs(argv: string[]): { theme?: string; out: string; help: boolean } {
  let theme: string | undefined;
  let out = "theme";
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") help = true;
    else if (a.startsWith("--theme=")) theme = a.slice("--theme=".length);
    else if (a === "--theme") theme = argv[++i];
    else if (a === "--out") out = argv[++i] ?? out;
    else if (a.startsWith("--out=")) out = a.slice("--out=".length);
  }
  return { theme, out, help };
}

const { theme, out, help } = parseArgs(Bun.argv.slice(2));

if (help) {
  console.log(usage());
  process.exit(0);
}

if (!theme) {
  console.error("Invalid theme payload.\nMissing --theme argument.\n\n" + usage());
  process.exit(1);
}

let options;
try {
  options = decodeTheme(theme);
} catch (e) {
  console.error(e instanceof Error ? e.message : "Invalid theme payload.");
  process.exit(1);
}

// Shared engine — same code path as the web preview.
const gen = generateTheme(options);
const fontsCss = generateFontsCss(options);
const files = generateThemeFiles(options, gen, fontsCss);

const dir = resolve(process.cwd(), out);
await mkdir(dir, { recursive: true });
for (const [name, content] of Object.entries(files)) {
  await writeFile(join(dir, name), content + "\n", "utf8");
  console.log(`wrote ${join(out, name)}`);
}
console.log(`\nTheme generated in ${out}/ — import "./${out}/index.css" (Tailwind v4: "./${out}/tw-bridge.css").`);
