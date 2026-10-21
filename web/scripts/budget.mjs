#!/usr/bin/env node
/**
 * Bundle-size budget for the web build.
 *
 *   node scripts/budget.mjs            # check dist/
 *   BUDGET_JS_KB=150 npm run budget    # tighten the JS budget
 *   BUDGET_TOTAL_KB=400 …              # tighten the total budget
 *
 * Fails (exit 1) when the gzipped JavaScript or the total gzipped output grows
 * past the budget. Raw sizes are shown for context; the budget is on gzip,
 * because that is what the browser downloads.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));
// Measured production build: JS ~73 kB gzip, total ~78 kB. About 1.6x headroom.
const JS_BUDGET_KB = Number(process.env.BUDGET_JS_KB ?? 120);
const TOTAL_BUDGET_KB = Number(process.env.BUDGET_TOTAL_KB ?? 160);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function kindOf(file) {
  if (file.endsWith(".js")) return "js";
  if (file.endsWith(".css")) return "css";
  if (file.endsWith(".html")) return "html";
  return "asset";
}

const files = walk(DIST).filter((file) =>
  /\.(js|css|html|webmanifest|svg|png|woff2)$/.test(file),
);

if (files.length === 0) {
  console.error("budget: no build output found — run `npm run build` first.");
  process.exit(1);
}

const rows = files
  .map((file) => ({
    file: file.slice(DIST.length + 1),
    kind: kindOf(file),
    raw: statSync(file).size,
    gzip: gzipSync(readFileSync(file)).length,
  }))
  .sort((a, b) => b.gzip - a.gzip);

const kb = (bytes) => (bytes / 1024).toFixed(1);
const jsGzip = rows.filter((r) => r.kind === "js").reduce((n, r) => n + r.gzip, 0);
const totalGzip = rows.reduce((n, r) => n + r.gzip, 0);
const totalRaw = rows.reduce((n, r) => n + r.raw, 0);

console.log("\nBundle budget (gzip)");
console.log(`${"file".padEnd(38)}${"kind".padEnd(7)}${"raw".padStart(10)}${"gzip".padStart(10)}`);
for (const row of rows) {
  console.log(
    `${row.file.padEnd(38)}${row.kind.padEnd(7)}${`${kb(row.raw)} kB`.padStart(10)}${`${kb(row.gzip)} kB`.padStart(10)}`,
  );
}

const failures = [];
if (jsGzip > JS_BUDGET_KB * 1024) failures.push(`JS ${kb(jsGzip)} kB > ${JS_BUDGET_KB} kB`);
if (totalGzip > TOTAL_BUDGET_KB * 1024)
  failures.push(`total ${kb(totalGzip)} kB > ${TOTAL_BUDGET_KB} kB`);

console.log(
  `\ntotal raw ${kb(totalRaw)} kB · total gzip ${kb(totalGzip)} kB (budget ${TOTAL_BUDGET_KB} kB) · JS gzip ${kb(jsGzip)} kB (budget ${JS_BUDGET_KB} kB)`,
);

if (failures.length > 0) {
  console.error(`\nbudget: FAIL — ${failures.join("; ")}`);
  console.error(
    "If the bundle looks far larger than expected, check NODE_ENV: a development\n" +
      "React build is roughly 120 kB gzip, a production build about 67 kB.",
  );
  process.exit(1);
}

console.log("budget: ok\n");
