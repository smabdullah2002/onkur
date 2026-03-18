import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const thisFilePath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(thisFilePath), "..");
const backendEnvPath = path.join(rootDir, "backend", ".env");
const frontendEnvPath = path.join(rootDir, "frontend", ".env.local");

function parseEnv(content) {
  const map = new Map();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    map.set(key, value);
  }
  return map;
}

function serializeEnv(map) {
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
}

if (!fs.existsSync(backendEnvPath)) {
  console.error("[env-sync] backend/.env not found. Skipping sync.");
  process.exit(0);
}

const backendEnv = parseEnv(fs.readFileSync(backendEnvPath, "utf8"));
const supabaseUrl = backendEnv.get("SUPABASE_URL") || "";
const supabaseAnonKey = backendEnv.get("SUPABASE_ANON_KEY") || backendEnv.get("SUPABASE_KEY") || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[env-sync] Missing SUPABASE_URL and/or SUPABASE_ANON_KEY (or SUPABASE_KEY fallback) in backend/.env");
  process.exit(1);
}

if (!backendEnv.get("SUPABASE_ANON_KEY") && backendEnv.get("SUPABASE_KEY")) {
  console.warn("[env-sync] Using SUPABASE_KEY as fallback for VITE_SUPABASE_ANON_KEY. Prefer setting SUPABASE_ANON_KEY in backend/.env.");
}

const currentFrontendEnv = fs.existsSync(frontendEnvPath)
  ? parseEnv(fs.readFileSync(frontendEnvPath, "utf8"))
  : new Map();

currentFrontendEnv.set("VITE_SUPABASE_URL", supabaseUrl);
currentFrontendEnv.set("VITE_SUPABASE_ANON_KEY", supabaseAnonKey);

fs.writeFileSync(frontendEnvPath, serializeEnv(currentFrontendEnv), "utf8");
console.log("[env-sync] Synced frontend/.env.local from backend/.env");
