// Entry point. It only loads the settings file and then starts the real server,
// so the settings are in place before any other file reads them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value; // real environment variables win
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.resolve(here, "..", ".env")); // backend/.env even when started from another folder

await import("./main");
