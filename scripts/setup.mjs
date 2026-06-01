import { execSync } from "node:child_process";
import { existsSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

if (!existsSync(envPath)) {
  cpSync(resolve(root, ".env.example"), envPath);
  console.log("Created .env from .env.example");
}

console.log("Installing dependencies...");
execSync("pnpm install", { cwd: root, stdio: "inherit" });
console.log("Setup complete!");
