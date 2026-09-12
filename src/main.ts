import './style.css';
import { ACHIEVEMENT_BY_ID } from './game/data';
import {
  canPrestige,
  checkAchievements,
  click,
  prestige,
  prestigeGain,
  tick,
} from './game/engine';
import { formatDuration, formatNumber } from './game/format';
import {
  computeOfflineEarnings,
  exportSave,
  importSave,
  load,
  save,
  SAVE_KEY,
} from './game/save';
import { createInitialState, type GameState } from './game/state';
import { createUi } from './ui/app';

const root = document.getElementById('app')!;

// --- load -------------------------------------------------------------------

let state: GameState;
let corruptSave = false;
let offlineSeconds = 0;
{
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    raw = null;
  }
  if (raw) {
    const loaded = load();
    if (loaded) {
      state = loaded;
      offlineSeconds = (Date.now() - state.lastSaveTime) / 1000;
    } else {
      state = createInitialState();
      corruptSave = true;
    }
  } else {
    state = createInitialState();
  }
}

// --- ui ---------------------------------------------------------------------

const ui = createUi(root, {
  onHarvest: doHarvest,
  onPrestige: confirmPrestige,
  onSaveNow: () => doSave(),
  onExport: () => exportSave(state),
  onImport: (encoded) => {
    const imported = importSave(encoded);
    if (!imported) return false;
    state = imported;
    ui.renderLists(state);
    return true;
  },
  onHardReset: () => {
    ui.showModal({
      title: 'Hard reset?',
      body: 'This wipes your entire save — broth, buildings, research, achievements, Bog Cores. There is no undo.',
      actions: [
        {
          label: 'Cancel',
          onClick: () => ui.closeModal(),
        },
        {
          label: 'Yes, wipe it',
          danger: true,
          onClick: () => {
            ui.showModal({
              title: 'Really sure?',
              body: 'Second confirmation: the bog will be drained forever.',
              actions: [
                { label: 'Back', onClick: () => ui.closeModal() },
                {
                  label: 'Drain forever',
                  danger: true,
                  onClick: () => {
                    try {
                      localStorage.removeItem(SAVE_KEY);
                    } catch {
                      /* ignore */
                    }
                    state = createInitialState();
                    ui.closeModal();
                    ui.renderLists(state);
                    ui.toast('Fresh bog. Good luck.');
                  },
                },
              ],
            });
          },
        },
      ],
    });
  },
});

function doHarvest(): void {
  const gained = click(state);
  ui.spawnFloat(gained);
  const btn = document.getElementById('harvest-btn')!;
  btn.classList.remove('squish');
  void btn.offsetWidth;
  btn.classList.add('squish');
  checkAchievementsNow();
}

function confirmPrestige(): void {
  const gain = prestigeGain(state);
  if (!canPrestige(state)) return;
  ui.showModal({
    title: 'Drain the Bog?',
    body: `Gain ${gain} Bog Core${gain === 1 ? '' : 's'} (+${gain * 5}% all production). The run resets — broth, compute, buildings, upgrades and research — but achievements and Bog Cores remain.`,
    actions: [
      { label: 'Cancel', onClick: () => ui.closeModal() },
      {
        label: `Drain for ${gain} 💠`,
        danger: true,
        onClick: () => {
          prestige(state);
          ui.closeModal();
          ui.renderLists(state);
          ui.toast(`The bog drains. +${gain} Bog Cores.`);
          checkAchievementsNow();
          doSave();
        },
      },
    ],
  });
}

function checkAchievementsNow(): void {
  for (const id of checkAchievements(state)) {
    const a = ACHIEVEMENT_BY_ID[id];
    ui.toast(`Achievement: ${a.emoji} ${a.name} — +1% production`);
  }
}

// --- saving -------------------------------------------------------------------

function doSave(): void {
  try {
    save(state);
    const t = new Date().toLocaleTimeString();
    ui.setSavedIndicator(`Saved ✓ ${t}`);
  } catch {
    ui.toast('Could not save — storage unavailable.');
  }
}

setInterval(doSave, 15_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') doSave();
});
window.addEventListener('beforeunload', doSave);

// --- keyboard -----------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() !== 'h') return;
  const target = e.target as HTMLElement | null;
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
  doHarvest();
});

// --- offline summary ----------------------------------------------------------

if (corruptSave) {
  ui.toast('Save was unreadable — started a fresh bog.');
}

if (offlineSeconds > 60) {
  const earned = computeOfflineEarnings(state, offlineSeconds);
  state.broth += earned.broth;
  state.compute += earned.compute;
  state.totalBrothEarned += earned.broth;
  state.totalComputeEarned += earned.compute;
  ui.showModal({
    title: 'Welcome back to the bog',
    body: `You were away ${formatDuration(earned.seconds)}. Your bog kept simmering at half rate: +${formatNumber(earned.broth)} broth, +${formatNumber(earned.compute)} compute.`,
    actions: [{ label: 'Back to work', onClick: () => ui.closeModal() }],
  });
}

// --- loop ---------------------------------------------------------------------

let last = performance.now();
let lastListRender = 0;

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 1);
  last = now;
  if (dt > 0) {
    tick(state, dt);
    checkAchievementsNow();
  }
  ui.renderCounters(state);
  if (now - lastListRender > 250) {
    lastListRender = now;
    ui.renderLists(state);
  }
  requestAnimationFrame(frame);
}

ui.renderLists(state);
requestAnimationFrame(frame);
