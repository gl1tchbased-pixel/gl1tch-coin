// Centralized path resolution (win32-safe). Everything anchors to the repo root
// so scripts work regardless of the cwd they're launched from.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// e2e/x/lib -> repo root is three levels up.
export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
export const X_DIR = path.resolve(REPO_ROOT, 'e2e', 'x');
export const DATA_DIR = path.resolve(X_DIR, 'data');
export const OUT_DIR = path.resolve(X_DIR, 'out');
export const PROFILES_DIR = path.resolve(X_DIR, '.profiles');
export const BRAND_DIR = path.resolve(REPO_ROOT, 'public', 'brand');
export const PUMP_PACK_DIR = path.resolve(REPO_ROOT, 'pump-pack');

// Which isolated profile to use. `test` first, then `main` for @gl1tchbased.
export const PROFILE_NAME = process.env.X_PROFILE || 'test';
export const PROFILE_DIR = path.resolve(PROFILES_DIR, PROFILE_NAME);

// The X handle to analyze in Stage 2 (defaults to the live account).
export const X_HANDLE = process.env.X_HANDLE || 'gl1tchbased';

export function ensureDirs() {
  for (const d of [OUT_DIR, PROFILE_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

// YYYY-MM-DD stamp for output filenames. Date is fine here (these scripts are
// run interactively, not inside a resumable workflow).
export function dateStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Resolve a media path from content-queue (relative to repo root or public/brand).
export function resolveMedia(rel) {
  if (!rel) return null;
  const candidates = [
    path.resolve(REPO_ROOT, rel),
    path.resolve(BRAND_DIR, rel),
    path.resolve(BRAND_DIR, path.basename(rel)),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}
