// Static decoder for the Anthropic Design "standalone" HTML bundler.
// Reads design/Sakura Prompt Studio _standalone_.html, extracts the
// __bundler/manifest JSON, base64-decodes + gunzips each entry, and writes
// the original files to phases/phase-9/_mockup-source/.

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, resolve, join } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..", "..");
const HTML_PATH = join(REPO_ROOT, "design", "Sakura Prompt Studio _standalone_.html");
const OUT_DIR = join(REPO_ROOT, "phases", "phase-9", "_mockup-source");

const html = readFileSync(HTML_PATH, "utf8");

const manifestMatch = html.match(
  /<script type="__bundler\/manifest">([\s\S]*?)<\/script>/
);
if (!manifestMatch) {
  console.error("No __bundler/manifest script tag found.");
  process.exit(1);
}

const templateMatch = html.match(
  /<script type="__bundler\/template">([\s\S]*?)<\/script>/
);

const manifest = JSON.parse(manifestMatch[1]);
const uuids = Object.keys(manifest);
console.log(`Manifest entries: ${uuids.length}`);

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

let written = 0;
for (const uuid of uuids) {
  const entry = manifest[uuid];
  const filename = entry.filename || entry.name || `${uuid}.bin`;
  const safe = filename.replace(/^\/+/, "").replace(/\.\./g, "_");
  const outPath = join(OUT_DIR, safe);
  mkdirSync(dirname(outPath), { recursive: true });

  const bytes = Buffer.from(entry.data, "base64");
  const decoded = entry.compressed ? gunzipSync(bytes) : bytes;
  writeFileSync(outPath, decoded);
  console.log(`  ${safe}  (${decoded.length} bytes)`);
  written++;
}

if (templateMatch) {
  writeFileSync(join(OUT_DIR, "_template.json"), templateMatch[1]);
  console.log("  _template.json (raw template script)");
}

console.log(`\nWrote ${written} files to ${OUT_DIR}`);
