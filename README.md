# Wall Street Legal (formerly Peat Bog Incremental)

An incremental/clicker web game about a **predatory ultra-low-latency litigation firm**. Bill legal-compute tokens, provision rack latency budgets, and settle **McFly & Chronicler LLP v Burger King Nordic** before Magistrate Reino. Eventually file *Chapter 11* to bank permanent precedents.

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
- **Production** is filtered by broth, peat, sphagnum, methane, cooling, compute, or evidence. New blueprints unlock progressively from your current production rate; each category shows the next classified blueprint. Prices scale ×1.15 per unit; buy in batches of 1 / 10 / 100 / Max from the dock at the bottom of the panel.
- **Resources**: 7 tracked resources — fp16 compute broth, raw peat, sphagnum moss, bog methane, compute, case evidence, and permanent Bog Cores. Peat cutters, moss nurseries, gas digesters, and evidence desks unlock new production paths.
- **Thermal mechanic**: compute buildings generate heat. Chillers and towers provide cooling. Compute production is multiplied by `min(1, cooling / heat)` — watch the thermal bar and keep it at 100%.
- **Progression** includes 36 buildings and 163 upgrades: resource-specific production terms, click tools, thermal systems, and four ×2 overclock tiers at 10 / 50 / 100 / 200 owned. Purchased upgrades move into the expandable owned-upgrades drawer, while upcoming upgrades preview their building requirements.
- **Research** is queued in order, up to three projects at once. Cancel a queued project to refund its cost; offline time advances research at full speed.
- **Settlement Docket** divides the trial into Discovery, Litigation, Verdict, and Keepers of the Bog filings. Complete each requirement and claim its reward, including permanent and timed multipliers.
- **Keepers of the Bog** is the Docket's oldest chapter. Find Pierre, Mia, Shrome, Samkals, Spaced, vwh, Hermano, Tassie, Kreatix, and Poke in the peat, gas, racks, and water; the four relics they leave behind make the bog remember their work.
- **Fieldwork** adds two direct-action minigames: hold and release Cut peat when the charge is full, or calibrate the racks after buying a Server Rack; consecutive calibration hits raise the payout while shrinking and moving the target zone, and a miss resets the streak. Calibration hits are judged against needle positions shown in the last 120 ms so input latency does not steal a visibly-green click; a hit lets you calibrate again at once, a miss locks the button for 5 s.
- **Achievements**: 27 to unlock, each granting +1% to all production. The **Docket** tab orders the trial milestones and highlights the next filing.
- **Charter**: spend banked Bog Cores on the 13-term Drainage Charter. Pan and zoom its node graph to inspect the terms; signed terms persist through every draining, but spent cores stop contributing their +5% production bonus.
- **Prestige — Drain the Bog**: petition Magistrate Reino to drain the bog. Once you've earned 1,000,000 compute in a run, reset for `floor(sqrt(totalCompute / 1e6))` Bog Cores. Each core gives +5% to all production, forever. Achievements, cores, and Charter terms persist.
- **Saving**: IndexedDB via `idb` autosaves every 15 s and on tab close, with a localStorage fallback. Earn offline progress at a 1% base rate plus Night Watch levels and Charter terms, capped at 8 hours; background tabs are credited when you return. Export/import saves as base64 from the Settings tab. Rotating field notes appear in the footer.

## Motion & cost

The interface uses a sliding filter pill, short progress-width transitions, success feedback through filing state, and an error shake for missed calibration. Reduced-motion preferences disable these effects. Needle and charge updates are direct `transform`/`width` writes with no layout thrash; verified by inspection: writes only transform/width.

## Tech stack

Vite + vanilla TypeScript with `idb`, no external assets or fonts. Pure, unit-tested game engine (`src/game/`), DOM rendering (`src/ui/`), CSS/SVG/emoji visuals.
