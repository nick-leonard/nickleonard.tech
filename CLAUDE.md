# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nick Leonard's personal site, live at https://nickleonard.tech. It is a Cloudflare Worker that is almost all static assets: `wrangler.jsonc` points `assets.directory` at `./public` and Cloudflare serves those files directly. Unknown paths serve `public/404.html` (`not_found_handling: "404-page"`). The one dynamic part is the snake leaderboard: `run_worker_first: ["/api/*"]` sends only `/api/*` to `src/worker.js`, which stores scores in the D1 database `nickleonard-tech` (binding `DB`, schema in `migrations/`).

## Snake leaderboard

- `public/snake.js` is a deterministic engine (seeded food, fixed 20x14 grid) imported by both the page and the Worker. Changing its rules changes how old runs replay, so a rule change means clearing `scores`.
- `POST /api/snake/start` hands out a run id and seed (table `runs`, rows older than a day are pruned). `POST /api/snake/score` takes the run id, the list of turns and 3-character initials; the Worker replays the turns to compute the score itself, rejects runs that don't replay, were already submitted, or finished faster than the game's tick speed allows, and blocks offensive initials (`BLOCKED`). `GET /api/snake/scores` returns the top 10.
- This stops forged scores, not a patient bot that plays in real time. To remove an entry: `npx wrangler d1 execute nickleonard-tech --remote --command "DELETE FROM scores WHERE id = N"`.
- Local: `npx wrangler d1 migrations apply nickleonard-tech --local`, then `npm run dev`.

## Commands

- `npm run dev` — local preview via `wrangler dev`
- `npm run deploy` — `wrangler deploy` (needs `npx wrangler login` first)
- `npx wrangler deploy --dry-run` — validate config and list assets without deploying

Pushes to `main` on GitHub (nick-leonard/nickleonard.tech) also deploy automatically via Cloudflare Workers Builds.

## Deployment notes

- `wrangler.jsonc` attaches `nickleonard.tech` and `www.nickleonard.tech` as Worker custom domains. A deploy fails with code 100117 if a hostname has any other A/AAAA/CNAME record in the zone; those must be deleted in the Cloudflare dashboard.
- The Worker name `nickleonard-tech` must match the Worker connected to the repo in Workers Builds.

## Page design

`public/index.html` is a single self-contained page styled as a terminal window (JetBrains Mono from Google Fonts, colors as CSS variables taken from the avatar: deep indigo, violet, rose, copper). It must fit one desktop screen without scrolling; below 760px it stacks into one column.

The large "Nick Leonard" heading (`h1`, and `.h1` when `whoami` is run in the interactive terminal) is rendered in ExtraBold (800) `JetBrains Mono` with a lavender-to-rose text gradient, soft violet glow, and an interactive hover/click glyph-decode animation (`decodeName`, disabled under `prefers-reduced-motion`). (`tools/banner_svg.py` is kept for reference from the earlier pixel-art banner.)

The last prompt line (`#live`) is an interactive terminal, driven by the inline `<script>` at the end of the page (plain JS, no build). On load it suggests `help` with a "press tab, then enter" hint ("tap to run" on touch screens). The first command switches the window to `.term` mode (photo hidden, window fills the screen, output scrolls inside it), animated with the View Transitions API where supported; `exit` restores the card. Commands and their content (projects, experience, stack, talks, `.now`, a small read-only filesystem for `ls`/`cd`/`cat`) live in the constants at the top of the script: edit those to change what visitors see, and update the `.now` date when you change it. Keep the full resume and personal contact details off the site: the only contact details are LinkedIn, GitHub, Rock House and the business email nick@rockhousetech.com (assembled in JS as `MAIL`). Without JavaScript the page is the static card.

Favicons (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`) are the pixel "N" from the same font. The `.ico` and `.png` were rendered from the SVG; regenerate them if the SVG changes.

`options/` (gitignored) holds earlier design explorations and is not deployed.
