// scripts/merge-members.mjs
//
// Fetches member.json files from external clubs and merges them into this
// repo's members.json, keyed by "id". Run with: node scripts/merge-members.mjs
//
// To onboard a new club, just add an entry to SOURCES below.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMBERS_PATH = path.join(__dirname, "..", "members.json");
const SOURCES = [
  {
    name: "lugvitc",
    url: "https://raw.githubusercontent.com/lugvitc/webring/refs/heads/master/members.json",
  },
];
const REQUIRED_FIELDS = ["id", "name", "url", "git_acc", "batch", "desc"];
async function fetchSource(source) {
  const res = await fetch(source.url, {
    headers: { "User-Agent": "vit-webring-sync" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("expected top-level JSON array");
  }
  return data;
}
function validateEntry(entry) {
  for (const key of REQUIRED_FIELDS) {
    if (typeof entry[key] !== "string" || !entry[key].trim()) {
      throw new Error(
        `entry ${JSON.stringify(entry.id ?? entry)} missing/invalid "${key}"`
      );
    }
  }
}
async function main() {
  const raw = await fs.readFile(MEMBERS_PATH, "utf8");
  const local = JSON.parse(raw);
  if (!Array.isArray(local)) {
    throw new Error("local members.json is not an array — aborting");
  }

  // Keep a mutable working copy so we can update entries in place while
  // appending brand-new ones at the end, instead of re-sorting everything.
  const merged = [...local];
  const indexById = new Map(merged.map((m, i) => [m.id, i]));
  const startingCount = merged.length;
  let added = 0;
  let updated = 0;

  for (const source of SOURCES) {
    let entries;
    try {
      entries = await fetchSource(source);
    } catch (err) {
      console.error(`[${source.name}] skipped fetch: ${err.message}`);
      continue;
    }
    for (const entry of entries) {
      try {
        validateEntry(entry);
      } catch (err) {
        console.error(`[${source.name}] skipped entry: ${err.message}`);
        continue;
      }
      if (indexById.has(entry.id)) {
        const idx = indexById.get(entry.id);
        const existing = merged[idx];
        if (JSON.stringify(existing) !== JSON.stringify(entry)) {
          updated++;
        }
        merged[idx] = entry; // update in place, position unchanged
      } else {
        indexById.set(entry.id, merged.length);
        merged.push(entry); // new entry goes to the end
        added++;
      }
    }
  }

  await fs.writeFile(MEMBERS_PATH, JSON.stringify(merged, null, 2) + "\n");
  console.log(
    `Done. ${startingCount} -> ${merged.length} entries ` +
      `(${added} added, ${updated} updated).`
  );
}
main().catch((err) => {
  console.error("Merge failed:", err);
  process.exit(1);
});