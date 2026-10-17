# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nick Leonard's personal site, live at https://nickleonard.tech. It is a static-assets-only Cloudflare Worker: there is no Worker script, `wrangler.jsonc` points `assets.directory` at `./public` and Cloudflare serves those files directly. Unknown paths serve `public/404.html` (`not_found_handling: "404-page"`).

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

The large "Nick Leonard" heading is ASCII art made of `█` (fill) and `▒` (left-edge shadow, wrapped in `<span class="s">`) inside `<pre class="banner">`. It comes from a small hand-drawn 7-row pixel font, not a figlet font. There are two copies: `.banner.wide` (one line, desktop) and `.banner.stack` (two lines, mobile). Font size uses container query units (`cqi`) on the `h1`, so it scales to its column. If the text changes, regenerate both copies rather than hand-editing the characters.

Favicons (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`) are the pixel "N" from the same font. The `.ico` and `.png` were rendered from the SVG; regenerate them if the SVG changes.

`options/` (gitignored) holds earlier design explorations and is not deployed.
