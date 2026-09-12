# Peat Bog Incremental

An incremental/clicker web game about the **Sector 4 Peat Bog Trial**. Harvest fp16 compute broth, cool the racks, and settle **McFly & Chronicler LLP v Burger King Nordic** before Magistrate Reino. Eventually *Drain the Bog* for permanent Bog Cores.

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

- **Click** the big cauldron button (or press `H`) to harvest fp16 compute broth. Your first Peat Harvester is ~15 clicks away.
- **Buildings** produce broth (Harvesters, Vats, Pumps), cooling (Chillers, Cooling Towers) or compute (Server Racks and up). Prices scale ×1.15 per unit; buy in batches of 1 / 10 / 100 / Max.
- **Thermal mechanic**: compute buildings generate heat. Chillers and towers provide cooling. Compute production is multiplied by `min(1, cooling / heat)` — watch the thermal bar and keep it at 100%.
- **Upgrades** multiply click power or double a building's output (unlocked at 10 owned).
- **Research & Litigation** is bought with compute: better cooling, lower heat, production multipliers, and the Magistrate Reino verdict.
- **Achievements**: 21 to unlock, each granting +1% to all production. The **Docket** tab orders the trial milestones and highlights the next filing.
- **Prestige — Drain the Bog**: petition Magistrate Reino to drain the bog. Once you've earned 1,000,000 compute in a run, reset for `floor(sqrt(totalCompute / 1e6))` Bog Cores. Each core gives +5% to all production, forever. Achievements and cores persist.
- **Saving**: IndexedDB via `idb` autosaves every 15 s and on tab close, with a localStorage fallback. Earn offline progress at 50% rate, capped at 8 hours. Export/import saves as base64 from the Settings tab.

## Tech stack

Vite + vanilla TypeScript with `idb`, no external assets or fonts. Pure, unit-tested game engine (`src/game/`), DOM rendering (`src/ui/`), CSS/SVG/emoji visuals.
