import './style.css';
import { ACHIEVEMENT_BY_ID, BUILDING_BY_ID, RESEARCH } from './game/data';
import {
  canPrestige,
  buyResearch,
  buyNightWatch,
  cancelResearch,
  checkAchievements,
  click,
  prestige,
  prestigeGain,
  revealBuildings,
  tick,
} from './game/engine';
import {
  computeOfflineEarnings,
  exportSave,
  importSave,
  SAVE_KEY,
  sanitizeElapsedSeconds,
  save as saveLocal,
  type OfflineEarnings,
} from './game/save';
import { advanceResearch } from './game/engine';
import { claimQuest, expireBuffs } from './game/quests';
import { calibrate, cutPeat } from './game/minigames';
import { clearState, isIndexedDbAvailable, loadWithMigration, saveState } from './game/db';
import { createInitialState } from './game/state';
import { RESOURCES } from './game/data';
import { formatDuration, formatNumber } from './game/format';
import { createUi } from './ui/app';
import { formatMultiplier } from './ui/text';
import { buyCharter, charterFactor } from './game/charter';

const root = document.getElementById('app')!;

async function init(): Promise<void> {
  let state = createInitialState();
  let corruptSave = false;
  let offlineSeconds = 0;
  let hadLegacySave = false;
  try {
    hadLegacySave = Boolean(localStorage.getItem(SAVE_KEY));
  } catch {
    hadLegacySave = false;
  }
  const loaded = await loadWithMigration();
  if (loaded) {
    state = loaded;
    offlineSeconds = Math.max(0, (Date.now() - state.lastSaveTime) / 1000);
  } else if (hadLegacySave) {
    corruptSave = true;
  }
  const newSave = !loaded && !hadLegacySave;

  const doSave = async (showError = true): Promise<void> => {
    try {
      if (isIndexedDbAvailable()) await saveState(state);
      else saveLocal(state);
      ui.setSavedIndicator(`Saved ✓ ${new Date().toLocaleTimeString()}`);
    } catch {
      try {
        saveLocal(state);
        ui.setSavedIndicator(`Saved locally ✓ ${new Date().toLocaleTimeString()}`);
        if (showError) ui.toast('IndexedDB unavailable — saved to localStorage fallback.');
      } catch {
        if (showError) ui.toast('Could not save — storage unavailable.');
      }
    }
  };

  function checkAchievementsNow(): void {
    for (const id of checkAchievements(state)) {
      const a = ACHIEVEMENT_BY_ID[id];
      ui.toast(`Achievement: ${a.emoji} ${a.name} — +1% production`);
    }
  }

  function revealBuildingsNow(): void {
    for (const id of revealBuildings(state)) {
      const building = BUILDING_BY_ID[id];
      ui.toast(`New blueprint: ${building.emoji} ${building.name}`);
    }
  }

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
      title: 'Drain the bog?',
      body: `Gain ${formatNumber(gain)} Bog Core${gain.eq(1) ? '' : 's'} (+${formatNumber(gain.mul(5))}% all production). The run resets — broth, compute, buildings, upgrades and research — but achievements and Bog Cores remain.`,
      actions: [
        { label: 'Cancel', onClick: () => ui.closeModal() },
        {
          label: `Drain for ${formatNumber(gain)} 💠`,
          danger: true,
          onClick: () => {
            prestige(state);
            ui.closeModal();
            ui.renderLists(state);
            ui.toast(`The bog drains. +${formatNumber(gain)} Bog Cores.`);
            checkAchievementsNow();
            void doSave();
          },
        },
      ],
    });
  }

  const ui = createUi(root, {
    initialTab: newSave ? 'docket' : 'buildings',
    persistenceBackend: isIndexedDbAvailable() ? 'IndexedDB (idb) · slot main' : 'localStorage fallback',
    onHarvest: doHarvest,
    onPrestige: confirmPrestige,
    onSaveNow: () => void doSave(),
    onExport: () => exportSave(state),
    onImport: (encoded) => {
      const imported = importSave(encoded);
      if (!imported) return false;
      state = imported;
      ui.renderLists(state);
      void doSave();
      return true;
    },
    onHardReset: () => {
      ui.showModal({
        title: 'Hard reset?',
        body: 'This wipes your entire save — broth, buildings, research, achievements, Bog Cores. There is no undo.',
        actions: [
          { label: 'Cancel', onClick: () => ui.closeModal() },
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
                      void clearState().catch(() => {});
                      try {
                        localStorage.removeItem(SAVE_KEY);
                      } catch {
                        // Ignore unavailable legacy storage.
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
    onCutPeat: (charge) => {
      const gained = cutPeat(state, charge);
      ui.spawnFloat(gained, 'peat');
      void doSave(false);
      return gained;
    },
    onCalibrate: (needlePos) => {
      const result = calibrate(state, needlePos);
      if (result.hit) {
        ui.spawnFloat(result.compute, 'compute');
        ui.toast(
          `+${formatNumber(result.compute)} compute · streak ${result.streak} (×${formatMultiplier(result.multiplier)})`,
        );
      }
      void doSave(false);
      return result;
    },
    onClaimQuest: (id) => {
      const reward = claimQuest(state, id);
      if (reward) void doSave();
      return reward;
    },
    onCancelResearch: (id) => {
      const cancelled = cancelResearch(state, id);
      if (cancelled) void doSave();
      return cancelled;
    },
    onQueueResearch: (id) => {
      const queued = buyResearch(state, id);
      if (queued) void doSave();
      return queued;
    },
    onBuyCharter: (id) => {
      const bought = buyCharter(state, id);
      if (bought) {
        checkAchievementsNow();
        void doSave();
      }
      return bought;
    },
    onBuyNightWatch: () => {
      const bought = buyNightWatch(state);
      if (bought) {
        checkAchievementsNow();
        void doSave();
      }
      return bought;
    },
  });

  let offlineResearch: string[] = [];
  function applyOfflineProgress(seconds: number, threshold = 60): OfflineEarnings | null {
    if (seconds < threshold) return null;
    const earned = computeOfflineEarnings(state, seconds);
    for (const resource of RESOURCES) {
      if (resource.id === 'bogCores') continue;
      const id = resource.id as keyof typeof earned.gained;
      const gained = earned.gained[id];
      const spent = earned.spent[id];
      state.wallet[resource.id] = state.wallet[resource.id].sub(spent).add(gained);
      state.lifetime[resource.id] = state.lifetime[resource.id].add(gained);
    }
    state.runCompute = state.runCompute.add(earned.gained.compute);
    expireBuffs(state);
    offlineResearch = advanceResearch(state, earned.seconds * charterFactor(state, 'researchSpeed'));
    return earned;
  }

  const offlineResourcesText = (earned: OfflineEarnings): string => [
    ...RESOURCES.filter((resource) => resource.id !== 'bogCores').map((resource) => {
      const value = earned.gained[resource.id as keyof typeof earned.gained];
      return value.gt(0) ? `+${formatNumber(value)} ${resource.name}` : '';
    }),
  ].filter(Boolean).join(', ');

  const offlineResearchText = (): string => offlineResearch.length > 0
    ? ` Research finished while away: ${offlineResearch
      .map((id) => RESEARCH.find((research) => research.id === id)?.name ?? id)
      .join(', ')}.`
    : '';

  const fireSave = (): void => {
    try {
      saveLocal(state);
    } catch {
      // IndexedDB may still complete after the page starts unloading.
    }
    void doSave(false);
  };

  setInterval(() => void doSave(), 15_000);
  let last = performance.now();
  let hiddenWall: number | null = null;
  let hiddenMono: number | null = null;
  document.addEventListener('visibilitychange', () => {
    root.classList.toggle('is-hidden', document.visibilityState === 'hidden');
    if (document.visibilityState === 'hidden') {
      hiddenWall = Date.now();
      hiddenMono = performance.now();
      void doSave();
      return;
    }
    if (hiddenWall === null || hiddenMono === null) return;
    const seconds = sanitizeElapsedSeconds(
      Date.now() - hiddenWall,
      performance.now() - hiddenMono,
    );
    hiddenWall = null;
    hiddenMono = null;
    const earned = applyOfflineProgress(seconds, 5);
    last = performance.now();
    if (!earned) return;
    ui.renderCounters(state);
    ui.renderLists(state);
    ui.toast(`Away ${formatDuration(earned.seconds)} · ${offlineResourcesText(earned)} at ${formatNumber(earned.rate * 100)}% offline rate`);
    void doSave();
  });
  window.addEventListener('beforeunload', fireSave);
  window.addEventListener('pagehide', fireSave);
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'h') return;
    const target = e.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    doHarvest();
  });

  if (corruptSave) ui.toast('Save was unreadable — started a fresh bog.');
  const initialOffline = applyOfflineProgress(offlineSeconds);
  if (initialOffline) {
    const lowRateText = initialOffline.rate < 0.1
      ? ' Buy Night Watch levels or sign Charter terms to keep more of it.'
      : '';
    ui.showModal({
      title: 'Welcome back to the bog',
      body: `You were away ${formatDuration(initialOffline.seconds)}. Your bog kept simmering at ${formatNumber(initialOffline.rate * 100)}% of full production: ${offlineResourcesText(initialOffline)}.${offlineResearchText()}${lowRateText}`,
      actions: [{ label: 'Back to work', onClick: () => ui.closeModal() }],
    });
  }

  let lastListRender = 0;
  function frame(now: number): void {
    const dt = Math.min((now - last) / 1000, 1);
    last = now;
    if (dt > 0) {
      tick(state, dt, Date.now());
      checkAchievementsNow();
      revealBuildingsNow();
    }
    ui.renderCounters(state);
    ui.renderFieldwork(state, now);
    if (now - lastListRender > 250) {
      lastListRender = now;
      ui.renderLists(state);
    }
    requestAnimationFrame(frame);
  }
  ui.renderLists(state);
  requestAnimationFrame(frame);
}

void init();
