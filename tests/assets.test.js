import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { assetVersion, versionAssets } from "../scripts/version-assets.js";
test("release versions every stylesheet, entry script and transitive module consistently", () => {
  const version = assetVersion();
  const html = fs.readFileSync("dist/index.html", "utf8");
  const entries = [
    ...html.matchAll(
      /(?:src|href)="\.\/([^"?]+\.(?:js|css))(\?v=[a-f0-9]{12})?"/g,
    ),
  ];
  assert.equal(entries.length, 5);
  for (const m of entries) assert.equal(m[2], "?v=" + version);
  for (const name of fs.readdirSync("dist").filter((f) => f.endsWith(".js"))) {
    const source = fs.readFileSync("dist/" + name, "utf8");
    for (const m of source.matchAll(
      /from\s+["']\.\/([^"'?]+\.js)(\?v=[a-f0-9]{12})?["']/g,
    ))
      assert.equal(m[2], "?v=" + version, name + " -> " + m[1]);
  }
});
test("asset version is stable across builds and changes for a dependency edit", () => {
  const work = path.resolve("work");
  fs.mkdirSync(work, { recursive: true });
  const dir = fs.mkdtempSync(path.join(work, "asset-test-"));
  try {
    fs.writeFileSync(
      path.join(dir, "index.html"),
      '<link href="./style.css"><script src="./app.js"></script>',
    );
    fs.writeFileSync(path.join(dir, "style.css"), "body{color:green}");
    fs.writeFileSync(
      path.join(dir, "app.js"),
      'import {x} from "./dependency.js";',
    );
    fs.writeFileSync(path.join(dir, "dependency.js"), "export const x=1;");
    const first = versionAssets(dir),
      once = fs.readFileSync(path.join(dir, "app.js"), "utf8");
    assert.equal(versionAssets(dir), first);
    assert.equal(fs.readFileSync(path.join(dir, "app.js"), "utf8"), once);
    fs.writeFileSync(path.join(dir, "dependency.js"), "export const x=2;");
    const next = versionAssets(dir);
    assert.notEqual(next, first);
    assert.ok(
      fs.readFileSync(path.join(dir, "app.js"), "utf8").includes("?v=" + next),
    );
    assert.ok(
      fs
        .readFileSync(path.join(dir, "index.html"), "utf8")
        .includes("?v=" + next),
    );
  } finally {
    if (!dir.startsWith(work + path.sep)) throw Error("Unsafe test cleanup");
    fs.rmSync(dir, { recursive: true });
  }
});
