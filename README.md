# Peat Bog Incremental

An incremental/clicker web game about harvesting **peat bog compute broth**. Click to scoop broth, build harvesters and vats for passive production, then stand up server racks that generate **compute** — but racks generate heat, and without enough **cooling** they throttle. Cool the racks, research improvements, and eventually *Drain the Bog* for permanent Bog Cores.

## Running

```bash
npm install
npm run dev       # dev server
npm run build     # production build to dist/
npm run preview   # serve the production build
npm test          # unit tests (vitest)
npm run lint      # eslint
npm run typecheck # tsc --noEmit
```

## How to play

- **Click** the big cauldron button (or press `H`) to harvest broth. Your first Peat Harvester is ~15 clicks away.
- **Buildings** produce broth (Harvesters, Vats, Pumps), cooling (Chillers, Cooling Towers) or compute (Server Racks and up). Prices scale ×1.15 per unit; buy in batches of 1 / 10 / 100 / Max.
- **Thermal mechanic**: compute buildings generate heat. Chillers and towers provide cooling. Compute production is multiplied by `min(1, cooling / heat)` — watch the thermal bar and keep it at 100%.
- **Upgrades** multiply click power or double a building's output (unlocked at 10 owned).
- **Research** is bought with compute: better cooling, lower heat, production multipliers.
- **Achievements**: 16 to unlock, each granting +1% to all production.
- **Prestige — Drain the Bog**: once you've earned 1,000,000 compute in a run, reset for `floor(sqrt(totalCompute / 1e6))` Bog Cores. Each core gives +5% to all production, forever. Achievements and cores persist.
- **Saving**: autosaves every 15 s and on tab close. Earn offline progress at 50% rate, capped at 8 hours. Export/import saves as base64 from the Settings tab.

## Tech stack

Vite + vanilla TypeScript, zero runtime dependencies, no external assets or fonts. Pure, unit-tested game engine (`src/game/`), DOM rendering (`src/ui/`), CSS/SVG/emoji visuals.
