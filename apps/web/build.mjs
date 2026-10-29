import fs from "node:fs";
import { execSync } from "node:child_process";

// If production bundle is already compiled and present in dist/, skip Vite compilation
if (fs.existsSync("./dist/index.html")) {
  console.log("✓ Pre-compiled production bundle found in dist/. Skipping local build.");
  process.exit(0);
}

try {
  execSync("tsc && vite build", { stdio: "inherit" });
} catch (err) {
  process.exit(1);
}
