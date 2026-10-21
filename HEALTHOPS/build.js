// Build script for HEALTHOPS.
//
// Bundles src/taskpane/taskpane.html into a single self-contained file at
// dist/healthops.html: the stylesheet, every script (Chart.js, the dashboard
// modules and the current data.js snapshot) and the icons are inlined, so the
// file can be opened or shared on its own without the src/ tree.
//
// data.js is also copied next to it, so the dashboard's Refresh button keeps
// working when a fresh macro export is dropped into dist/.
//
// Usage: npm run build
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PAGE_DIR = path.join(ROOT, "src", "taskpane");
const DIST = path.join(ROOT, "dist");
const OUT_FILE = path.join(DIST, "healthops.html");

const MIME = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function read(rel) {
  const file = path.resolve(PAGE_DIR, rel);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing file referenced by taskpane.html: ${path.relative(ROOT, file)}`);
  }
  // Strip the UTF-8 BOM the VBA macro writes into data.js.
  return fs.readFileSync(file, "utf8").replace(/^﻿/, "");
}

function dataUri(rel) {
  const file = path.resolve(PAGE_DIR, rel);
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`No MIME type known for ${rel}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

// Keep inlined code from closing its own <script>/<style> tag early.
const escapeScript = (code) => code.replace(/<\/script/gi, "<\\/script");
const escapeStyle = (code) => code.replace(/<\/style/gi, "<\\/style");

const isLocal = (url) => !/^(https?:)?\/\//i.test(url) && !url.startsWith("data:");

function build() {
  let html = read("taskpane.html");

  // <script src="..."></script> -> inline script (attributes other than src are kept,
  // so data.js keeps its data-healthops-data marker for Refresh).
  html = html.replace(
    /<script([^>]*?)\ssrc="([^"]+)"([^>]*)><\/script>/gi,
    (tag, before, src, after) => {
      if (!isLocal(src)) return tag;
      return `<script${before}${after}>\n${escapeScript(read(src))}\n</script>`;
    }
  );

  // <link rel="stylesheet" href="..."> -> inline <style>
  html = html.replace(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/gi, (tag, href) => {
    if (!isLocal(href)) return tag;
    return `<style>\n${escapeStyle(read(href))}\n</style>`;
  });

  // Icon links -> data URIs
  html = html.replace(/<link([^>]*\brel="(?:icon|apple-touch-icon)"[^>]*)>/gi, (tag) =>
    tag.replace(/href="([^"]+)"/i, (attr, href) => (isLocal(href) ? `href="${dataUri(href)}"` : attr))
  );

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(OUT_FILE, html, "utf8");
  fs.copyFileSync(path.join(PAGE_DIR, "data.js"), path.join(DIST, "data.js"));

  const kb = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
  console.log(`Built ${path.relative(ROOT, OUT_FILE)} (${kb} KB)`);
}

try {
  build();
} catch (err) {
  console.error(`Build failed: ${err.message}`);
  process.exit(1);
}
