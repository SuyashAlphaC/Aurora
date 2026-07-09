#!/usr/bin/env node
/**
 * Create (or find) the Aurora Webex space and print WEBEX_SPACE_ID for .env
 *
 * Usage:
 *   WEBEX_BOT_TOKEN=xxx node scripts/webex-setup-room.mjs
 *   node scripts/webex-setup-room.mjs --token xxx
 *   node scripts/webex-setup-room.mjs --list
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ROOM_TITLE = "Aurora Command Center";
const API = "https://webexapis.com/v1";

function loadTokenFromEnvFile() {
  const envPath = resolve(ROOT, "services/api/.env");
  if (!existsSync(envPath)) return "";
  const text = readFileSync(envPath, "utf8");
  const match = text.match(/^WEBEX_BOT_TOKEN=(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

function parseArgs(argv) {
  const args = { list: false, token: process.env.WEBEX_BOT_TOKEN ?? "" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--list") args.list = true;
    if (argv[i] === "--token" && argv[i + 1]) args.token = argv[++i];
  }
  if (!args.token) args.token = loadTokenFromEnvFile();
  return args;
}

async function webexFetch(token, path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message ?? body.errors?.[0]?.description ?? `Webex ${res.status}`);
  }
  return body;
}

async function listRooms(token) {
  const data = await webexFetch(token, "/rooms?sortBy=lastactivity");
  console.log("\nYour Webex rooms:\n");
  for (const room of data.items ?? []) {
    console.log(`  ${room.title}`);
    console.log(`    id: ${room.id}`);
    console.log(`    type: ${room.type}\n`);
  }
}

async function findRoomByTitle(token, title) {
  const data = await webexFetch(token, "/rooms?sortBy=lastactivity&max=100");
  return (data.items ?? []).find((r) => r.title === title);
}

async function createRoom(token, title) {
  return webexFetch(token, "/rooms", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

async function main() {
  const { token, list } = parseArgs(process.argv);

  if (!token) {
    console.error("Missing WEBEX_BOT_TOKEN.");
    console.error("Set it in services/api/.env or pass --token YOUR_BOT_TOKEN");
    process.exit(1);
  }

  if (list) {
    await listRooms(token);
    return;
  }

  console.log(`Looking for room "${ROOM_TITLE}"...`);
  let room = await findRoomByTitle(token, ROOM_TITLE);

  if (room) {
    console.log("Room already exists.");
  } else {
    console.log("Creating room...");
    room = await createRoom(token, ROOM_TITLE);
    console.log("Room created.");
  }

  console.log("\nAdd to services/api/.env:\n");
  console.log(`WEBEX_SPACE_ID=${room.id}`);
  console.log("\nNext:");
  console.log("  1. Open Webex → join space 'Aurora Command Center' (bot created it)");
  console.log("  2. Restart API → ./scripts/demo-golden-path.sh");
  console.log("  3. CRITICAL alert should appear in the space\n");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
