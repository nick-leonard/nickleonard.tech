-- Snake leaderboard. runs: one row per game started (the seed the server handed out);
-- scores: verified results. Apply with: npx wrangler d1 migrations apply nickleonard-tech --remote
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  seed INTEGER NOT NULL,
  started_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX runs_started ON runs (started_at);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initials TEXT NOT NULL,
  score INTEGER NOT NULL,
  ticks INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX scores_rank ON scores (score DESC, ticks ASC, created_at ASC);
