// Forgot the owner's password? Stop the server first, then run:
//   node scripts/reset-password.mjs you@example.com "a-new-password"
// (Data folder: HOTSPOTPRO_DATA_DIR, default ./data)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [, , emailArg, newPassword] = process.argv;
if (!emailArg || !newPassword) {
  console.error('Usage: node scripts/reset-password.mjs <email> "<new password>"');
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error("The new password must be at least 8 characters.");
  process.exit(1);
}
const file = path.join(path.resolve(process.env.HOTSPOTPRO_DATA_DIR || "data"), "db.json");
if (!fs.existsSync(file)) {
  console.error(`No database at ${file}. Run this from the backend folder, with the server stopped.`);
  process.exit(1);
}
const db = JSON.parse(fs.readFileSync(file, "utf8"));
const account = (db.accounts ?? []).find((a) => a.email.toLowerCase() === emailArg.trim().toLowerCase());
if (!account) {
  console.error(`No account with the email ${emailArg}. Accounts: ${(db.accounts ?? []).map((a) => a.email).join(", ") || "(none)"}`);
  process.exit(1);
}
const salt = crypto.randomBytes(16);
account.passwordHash = `scrypt$${salt.toString("hex")}$${crypto.scryptSync(newPassword, salt, 64).toString("hex")}`;
fs.writeFileSync(file + ".tmp", JSON.stringify(db));
fs.renameSync(file + ".tmp", file);
console.log(`Password changed for ${account.email}. Start the server and sign in.`);
