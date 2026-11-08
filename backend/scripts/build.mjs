// Bundles the whole backend (TypeScript) into ONE file: dist/server.mjs.
// `npm start` runs that file with plain Node, so the backend needs no install to run.
// Run this after you change anything under src/:   npm run build
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await build({
  entryPoints: [path.join(root, "src", "index.ts")],
  outfile: path.join(root, "dist", "server.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: false,
  legalComments: "none",
  logLevel: "info",
  alias: { "@": path.join(root, "src"), "next/server": path.join(root, "src", "http", "next-shim.ts") },
  // some bundled code still uses require()
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
console.log("Built dist/server.mjs");
