// Put a safety copy back:  node scripts/restore-backup.mjs            (lists the copies)
//                          node scripts/restore-backup.mjs db-2026-11-07T08-00-00.json   (restores that one)
// Stop HotspotPro first. The current data is saved as backups/before-restore-<time>.json, so nothing is lost.
import fs from "node:fs";
import path from "node:path";

const data = path.resolve(process.env.HOTSPOTPRO_DATA_DIR || "data");
const dir = path.join(data, "backups");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
const wanted = process.argv[2];
if (!wanted) {
  console.log(files.length ? "Safety copies (oldest first):\n  " + files.join("\n  ") : "No safety copies yet (they are made every time the backend starts).");
  process.exit(0);
}
if (!files.includes(wanted)) { console.error("No such copy. Run without a name to see the list."); process.exit(1); }
const live = path.join(data, "db.json");
if (fs.existsSync(live)) fs.copyFileSync(live, path.join(dir, `before-restore-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`));
fs.copyFileSync(path.join(dir, wanted), live);
console.log(`Restored ${wanted}. Start HotspotPro again.`);
