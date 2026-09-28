import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_THEME,
  decodeTheme,
  encodeTheme,
  generateTheme,
} from "@tsup-system/core";

describe("cli output", () => {
  const pkgDir = new URL("..", import.meta.url).pathname;
  test("payload generates expected files with engine-identical values", async () => {
    const payload = encodeTheme(DEFAULT_THEME);
    const out = await mkdtemp(join(tmpdir(), "tsup-cli-test-"));
    const proc = Bun.spawn(["bun", "run", "src/index.ts", `--theme=${payload}`, "--out", out], {
      cwd: pkgDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;
    expect(code).toBe(0);

    const files = await readdir(out);
    for (const name of ["root.css", "fonts.css", "base.css", "typography.css", "markdown.css", "layout.css", "tailwind.css", "index.css"]) {
      expect(files).toContain(name);
    }

    // Same engine as the web preview: values must match generateTheme() exactly.
    const gen = generateTheme(decodeTheme(payload));
    const rootCss = await readFile(join(out, "root.css"), "utf8");
    expect(rootCss).toContain(`--accent-600: ${gen.variables["--accent-600"]};`);
    expect(rootCss).toContain(`--brand-primary-600: ${gen.variables["--brand-primary-600"]};`);

    const markdownCss = await readFile(join(out, "markdown.css"), "utf8");
    expect(markdownCss).not.toMatch(/blue-600|red-500|amber-100/);
    expect(markdownCss).toContain("var(--prose-on-quote)");
    expect(markdownCss).toContain("var(--accent-on-base)");
    expect(rootCss).toContain(`--accent-light: ${gen.variables["--accent-light"]};`);
    expect(rootCss).toContain(`--prose-on-base: ${gen.variables["--prose-on-base"]};`);
  });

  test("missing theme fails with useful error", async () => {
    const proc = Bun.spawn(["bun", "run", "src/index.ts"], {
      cwd: pkgDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;
    expect(code).toBe(1);
    const err = await new Response(proc.stderr).text();
    expect(err).toMatch(/Missing --theme/);
  });

  test("bad payload fails without stack trace", async () => {
    const proc = Bun.spawn(["bun", "run", "src/index.ts", "--theme=!!!not-valid!!!"], {
      cwd: pkgDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;
    expect(code).toBe(1);
    const err = await new Response(proc.stderr).text();
    expect(err).toMatch(/Invalid theme payload/);
    expect(err).not.toMatch(/at .*\(.*\)/);
  });
});
