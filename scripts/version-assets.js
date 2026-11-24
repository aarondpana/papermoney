import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
export function assetVersion(directory = "dist") {
  const hash = createHash("sha256");
  for (const name of fs
    .readdirSync(directory)
    .filter((f) => /\.(js|css)$/.test(f))
    .sort()) {
    hash.update(name + "\0");
    hash.update(
      fs
        .readFileSync(path.join(directory, name), "utf8")
        .replace(/\?v=[a-f0-9]{12}/g, ""),
    );
  }
  return hash.digest("hex").slice(0, 12);
}
export function versionAssets(directory = "dist") {
  const version = assetVersion(directory);
  for (const name of fs
    .readdirSync(directory)
    .filter((f) => f.endsWith(".js"))) {
    const file = path.join(directory, name),
      source = fs.readFileSync(file, "utf8");
    const next = source.replace(
      /(["']\.\/[^"'?#]+\.js)(?:\?v=[a-f0-9]{12})?(["'])/g,
      `$1?v=${version}$2`,
    );
    if (next !== source) fs.writeFileSync(file, next);
  }
  const file = path.join(directory, "index.html"),
    source = fs.readFileSync(file, "utf8");
  const next = source.replace(
    /((?:src|href)="\.\/[^"?#]+\.(?:js|css))(?:\?v=[a-f0-9]{12})?"/g,
    `$1?v=${version}"`,
  );
  if (next !== source) fs.writeFileSync(file, next);
  return version;
}
