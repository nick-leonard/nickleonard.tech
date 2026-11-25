// The site is static assets; this Worker only answers /api/* (see run_worker_first
// in wrangler.jsonc) for the snake leaderboard, and hands everything else to ASSETS.
import { replay } from "../public/snake.js";

const DAY = 86400000;
const MAX_MOVES = 20000;
// Initials that never reach the board.
const BLOCKED = new Set(("ASS FUK FUC FCK FKU CUK CUM CUN KNT TIT SEX SXY DIK DIC DIX COK KOK " +
  "FAG FGT NIG NGR NGA KKK KYS JIZ JIS POO PEE PIS WTF STD VAG PUS PRK HOE HOR SUK SUC " +
  "NAZ RAP RPE").split(" "));

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const top = async (env) =>
  (await env.DB.prepare("SELECT id, initials, score FROM scores ORDER BY score DESC, ticks ASC, created_at ASC LIMIT 10").all()).results;

async function start(env) {
  const id = crypto.randomUUID();
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM runs WHERE started_at < ?").bind(now - DAY),
    env.DB.prepare("INSERT INTO runs (id, seed, started_at) VALUES (?, ?, ?)").bind(id, seed, now),
  ]);
  return json({ id, seed });
}

async function submit(req, env) {
  if (Number(req.headers.get("content-length") || 0) > 400000) return json({ error: "too large" }, 413);
  const body = await req.json().catch(() => null);
  const { id, moves, initials } = body || {};
  if (typeof id !== "string" || !Array.isArray(moves) || moves.length > MAX_MOVES ||
      !moves.every((m) => Array.isArray(m) && Number.isInteger(m[0]) && ["u", "d", "l", "r"].includes(m[1]))) {
    return json({ error: "bad request" }, 400);
  }
  const name = String(initials || "").toUpperCase();
  if (!/^[A-Z0-9]{3}$/.test(name)) return json({ error: "initials must be 3 letters or digits" }, 400);
  if (BLOCKED.has(name)) return json({ error: "pick different initials" }, 400);

  const run = await env.DB.prepare("SELECT seed, started_at FROM runs WHERE id = ?").bind(id).first();
  if (!run) return json({ error: "unknown or expired game" }, 404);
  const claimed = await env.DB.prepare("UPDATE runs SET used = 1 WHERE id = ? AND used = 0").bind(id).run();
  if (claimed.meta.changes !== 1) return json({ error: "already submitted" }, 409);

  const g = replay(run.seed, moves);
  if (!g || !g.dead) return json({ error: "that game doesn't replay" }, 422);
  if (Date.now() - run.started_at < g.ms * 0.8) return json({ error: "faster than the game runs" }, 422);
  if (g.score < 1) return json({ error: "score 0 isn't on the board" }, 422);

  const row = await env.DB.prepare("INSERT INTO scores (initials, score, ticks, created_at) VALUES (?, ?, ?, ?) RETURNING id")
    .bind(name, g.score, g.tick, Date.now()).first();
  const ahead = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE score > ? OR (score = ? AND ticks < ?)")
    .bind(g.score, g.score, g.tick).first();
  return json({ id: row.id, score: g.score, rank: ahead.n + 1, top: await top(env) });
}

export default {
  async fetch(req, env) {
    const { pathname } = new URL(req.url);
    try {
      if (pathname === "/api/snake/start" && req.method === "POST") return await start(env);
      if (pathname === "/api/snake/score" && req.method === "POST") return await submit(req, env);
      if (pathname === "/api/snake/scores" && req.method === "GET") return json({ top: await top(env) });
    } catch (e) {
      console.error(e);
      return json({ error: "server error" }, 500);
    }
    if (pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(req);
  },
};
