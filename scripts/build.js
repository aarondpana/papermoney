import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const required = [
  "chain-ui.js",
  "chain-model.js",
  "chain-orders.js",
  "chain.css",
  "index.html",
  "app.js",
  "pricing.js",
  "accounting.js",
  "execution.js",
  "storage.js",
  "lessons.js",
  "style.css",
  "training.css",
  "training-ui.js",
  "training-charts.js",
  "training-engine.js",
  "training-storage.js",
  "chart-content.js",
  "daytrade-content.js",
  "platform-engine.js",
  "platform-ui.js",
  "platform-charts.js",
  "hourly-content.js",
  "platform.css",
];
for (const f of required)
  if (!fs.existsSync("dist/" + f)) throw Error("Missing " + f);
for (const f of fs.readdirSync("dist").filter((f) => f.endsWith(".js"))) {
  execFileSync(process.execPath, ["--check", path.join("dist", f)], {
    stdio: "pipe",
  });
  const source = fs.readFileSync(path.join("dist", f), "utf8");
  for (const match of source.matchAll(/from\s+['"]\.\/([^'"]+)['"]/g))
    if (!fs.existsSync(path.join("dist", match[1])))
      throw Error("Missing module " + match[1]);
}
fs.writeFileSync("dist/.nojekyll", "");
console.log(
  "Static production files, module references and JavaScript syntax verified. No runtime dependencies or compilation required.",
);
