// Deterministic snake engine, shared by the page (public/index.html) and the
// leaderboard Worker (src/worker.js). Given the same seed and the same list of
// turns, it always plays out the same game, so the server can replay a run and
// compute its score instead of trusting the browser. Keep it free of DOM code.

export const W = 20;
export const H = 14;
export const DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };
const OPPOSITE = { u: "d", d: "u", l: "r", r: "l" };

// mulberry32: small, fast, seedable PRNG
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function placeFood(g) {
  const taken = new Set(g.snake.map(([x, y]) => y * W + x));
  const free = [];
  for (let i = 0; i < W * H; i++) if (!taken.has(i)) free.push(i);
  if (!free.length) { g.food = null; return; }
  const i = free[Math.floor(g.rand() * free.length)];
  g.food = [i % W, Math.floor(i / W)];
}

export function newGame(seed) {
  const y = Math.floor(H / 2);
  const g = { rand: rng(seed), snake: [[5, y], [4, y], [3, y]], dir: "r", food: null, score: 0, tick: 0, ms: 0, dead: false };
  placeFood(g);
  return g;
}

// Milliseconds per tick: speeds up as the snake eats.
export const tickMs = (score) => Math.max(70, 140 - score * 3);

// Change direction before the next step. Returns false for a no-op or a reversal.
export function turn(g, d) {
  if (!DIRS[d] || d === g.dir || d === OPPOSITE[g.dir]) return false;
  g.dir = d;
  return true;
}

export function step(g) {
  if (g.dead) return;
  const [dx, dy] = DIRS[g.dir];
  const [hx, hy] = g.snake[0];
  const nx = hx + dx, ny = hy + dy;
  const eating = g.food && nx === g.food[0] && ny === g.food[1];
  const body = eating ? g.snake : g.snake.slice(0, -1); // the tail moves out of the way unless we grow
  if (nx < 0 || ny < 0 || nx >= W || ny >= H || body.some(([x, y]) => x === nx && y === ny) || !g.food) {
    g.dead = true;
    return;
  }
  g.ms += tickMs(g.score);
  g.snake.unshift([nx, ny]);
  if (eating) { g.score++; placeFood(g); } else g.snake.pop();
  g.tick++;
}

// Replay a run from its seed and turns ([tick, dir] pairs, ticks strictly
// increasing). Returns the finished game, or null if the turns are invalid.
export function replay(seed, moves, maxTicks = 200000) {
  const g = newGame(seed);
  let i = 0, last = -1;
  while (!g.dead && g.tick < maxTicks) {
    if (i < moves.length && moves[i][0] === g.tick) {
      const [t, d] = moves[i];
      if (t <= last || !turn(g, d)) return null;
      last = t;
      i++;
    }
    step(g);
  }
  return i === moves.length ? g : null;
}
