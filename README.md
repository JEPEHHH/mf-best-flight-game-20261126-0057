# mf-best-flight-game-20261126-0057

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/JEPEHHH/mf-best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/JEPEHHH/mf-best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

best-flight-game-20261126-0057

## Run it

```sh
bash run.sh
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>


---

# RIDGELINE — Skyrunner Flight Trainer

An original, offline, dependency-free flight game. You fly the Kestrel Mk II
over a procedural granite coast, thread six amber gate rings, then bring the
wheels down on strip 07. Throttle, bank discipline, fuel, g-load and terrain
all matter; the HUD shows altitude, speed, heading, attitude and systems state.

## Files

- `game/` — static browser game, no build step. Open `game/index.html` in a
  desktop browser, or serve the folder with any static HTTP server.
- `screenshots/` — three renders taken from the game itself; the first by name
  is the cover.
- `main.ts` — Node 22 hand-in program: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json`.
- `vendor/makefun-game.ts` — re-export of the untouched kit dossier builder in
  `starter/vendor/makefun-game.ts`.
- `LICENSE` — MIT, Copyright (c) 2026 jepehhh.

## Controls

W/S throttle, A/D bank, arrow keys pitch, G gear, R restart, mouse camera look.

## Local hand-in

    mkdir -p out
    MAKEFUN_OUTPUT_DIR=out node main.ts

Everything is standard library only; the program performs no network access.
