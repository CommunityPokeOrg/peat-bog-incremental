import {
  ACHIEVEMENTS,
  BUILDING_BY_ID,
  BUILDINGS,
  RESOURCES,
  RESEARCH,
  RESEARCH_BY_ID,
  RESEARCH_BRANCHES,
  FIELD_NOTES,
  UPGRADES,
  UPGRADE_BY_ID,
  type ProductionLine,
  type ResearchBranch,
} from '../game/data';
import {
  bulkCost,
  buyNightWatch,
  buildingVisible,
  buyBuilding,
  buyResearch,
  buyUpgrade,
  canAfford,
  canPrestige,
  clickPower,
  maxAffordable,
  maxResearchQueue,
  nightWatchCost,
  prestigeGain,
  productionPerSecond,
  researchProgress,
  thermalFactor,
  totalCooling,
  totalHeat,
  upgradeVisible,
} from '../game/engine';
import { formatCost, formatDuration, formatNumber } from '../game/format';
import { offlineRateBreakdown } from '../game/save';
import { type Decimal } from '../game/decimal';
import type { GameState } from '../game/state';
import {
  ALL_QUESTS,
  BOUNTIES,
  acceptBounty,
  bountyInstance,
  bountyProgress,
  claimBounty,
  claimQuest,
  questProgress,
  questReady,
  type QuestReward,
} from '../game/quests';
import { CHARTER, CHARTER_BRANCHES, CHARTER_BY_ID, CHARTER_ROOT_ID, buyCharter, charterAvailable, type CharterNodeDef } from '../game/charter';
import { layoutCharter } from './charterLayout';
import { describeResearchEffect, formatCharterEffect, formatMultiplier, formatQuestReward, pluralize } from './text';
import { researchBranch } from '../game/data';
import {
  calibrationNeedle,
  calibrationZone,
  needleAtClick,
  peatCutCharge,
  streakMultiplier,
  type CalibrationResult,
  type NeedleFrame,
} from '../game/minigames';
import {
  CHARTER_DRAG_THRESHOLD_PX,
  CHARTER_MAX_SCALE,
  CHARTER_MIN_SCALE,
  CHARTER_ZOOM_STEP,
  clampPan,
  centreOn,
  panBy,
  toCss,
  wheelZoomFactor,
  zoomAt,
  type CharterView,
} from './charterView';
import {
  EMBLEM_ALEMBIC,
  EMBLEM_GEAR,
  EMBLEM_SCROLL,
  EMBLEM_SLIDERS,
  EMBLEM_SPADE,
  EMBLEM_SPEAKER_OFF,
  EMBLEM_SPEAKER_ON,
  EMBLEM_STAR,
  EMBLEM_STONE,
} from './emblems';
import { createSound } from './sound';

type TabId = 'docket' | 'buildings' | 'upgrades' | 'research' | 'achievements' | 'charter' | 'settings';
type Qty = number | 'max';
type SceneId = 'hall' | 'cut' | 'shed' | 'still' | 'stones' | 'sky' | 'office';

const TAB_SCENES: Record<TabId, SceneId> = {
  docket: 'hall',
  buildings: 'cut',
  upgrades: 'shed',
  research: 'still',
  achievements: 'stones',
  charter: 'sky',
  settings: 'office',
};

const TAB_EMBLEMS: Record<TabId, string> = {
  docket: EMBLEM_SCROLL,
  buildings: EMBLEM_SPADE,
  upgrades: EMBLEM_GEAR,
  research: EMBLEM_ALEMBIC,
  achievements: EMBLEM_STONE,
  charter: EMBLEM_STAR,
  settings: EMBLEM_SLIDERS,
};

const WISP_POSITIONS = [
  [8, 22, 16, -2],
  [19, 68, 22, -9],
  [31, 38, 18, -14],
  [45, 82, 26, -6],
  [57, 18, 20, -17],
  [68, 54, 24, -11],
  [76, 31, 15, -4],
  [87, 74, 21, -20],
  [94, 12, 25, -8],
] as const;

const SUCCESS_CHECK = '<svg class="t-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg>';

export interface UiHooks {
  initialTab?: TabId;
  persistenceBackend?: string;
  onHarvest(): void;
  onPrestige(): void;
  onSaveNow(): void;
  onExport(): string;
  onImport(encoded: string): boolean;
  onHardReset(): void;
  onCutPeat?(charge: number): Decimal | void;
  onCalibrate?(needlePos: number): CalibrationResult | void;
  onClaimQuest?(id: string): QuestReward | null | void;
  onCancelResearch?(id: string): boolean | void;
  onQueueResearch?(id: string): boolean | void;
  onBuyCharter?(id: string): boolean;
  onBuyNightWatch?(): boolean;
}

export interface Ui {
  /** Update the always-visible counters; call every frame. */
  renderCounters(state: GameState): void;
  /** Re-render the tab lists (buildings, upgrades, etc.); call periodically and after actions. */
  renderLists(state: GameState): void;
  renderThermal(state: GameState): void;
  renderPrestige(state: GameState): void;
  toast(message: string): void;
  /** Floating "+N" at the harvest button. */
  spawnFloat(amount: Decimal | number, resource?: string): void;
  renderFieldwork(state: GameState, now?: number): void;
  showModal(opts: { title: string; body: string; actions: { label: string; danger?: boolean; onClick(): void }[] }): void;
  closeModal(): void;
  setSavedIndicator(text: string): void;
}

export function createUi(root: HTMLElement, hooks: UiHooks): Ui {
  root.innerHTML = `
    <header class="ledger-strip">
      <div class="ledger-main">
        <div class="wordmark">
          <h1>Peat Bog</h1>
          <p class="case-label">Sector 4 · The Peat Bog Trial</p>
        </div>
        <div class="resources" id="resources" aria-live="polite" aria-atomic="true"></div>
      </div>
      <div class="ledger-subrow">
        <div class="buffs" id="buffs" aria-live="polite"></div>
        <div class="next-hint" id="next-hint" aria-live="polite"></div>
      </div>
    </header>
    <main class="layout">
      <section class="harvest-panel" aria-label="Harvest">
        <div class="card harvest-card">
          <p class="eyebrow">Primary action · broth line</p>
          <div class="harvest-zone" id="harvest-zone">
            <button id="harvest-btn" class="harvest-btn" aria-label="Harvest broth (shortcut: H)">
              <span class="harvest-emoji" aria-hidden="true">🫧</span>
              <span class="harvest-label">Harvest broth</span>
              <span class="bubble bubble-a" aria-hidden="true"></span>
              <span class="bubble bubble-b" aria-hidden="true"></span>
              <span class="bubble bubble-c" aria-hidden="true"></span>
            </button>
            <div class="float-layer" id="float-layer" aria-hidden="true"></div>
          </div>
          <p class="click-power">Click power: <strong id="click-power">1</strong> broth <kbd>H</kbd></p>
        </div>
        <div class="card thermal-card">
          <div class="card-heading">
            <div>
              <p class="eyebrow">Thermal gauge</p>
              <h2>Rack temperature</h2>
            </div>
            <span class="thermal-state">LIVE</span>
          </div>
          <div class="thermal-labels">
            <span id="thermal-text">No heat generated</span>
            <span id="thermal-pct"></span>
          </div>
          <div class="thermal-bar" role="meter" aria-label="Cooling versus heat" id="thermal-meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
            <div class="thermal-fill" id="thermal-fill"></div>
          </div>
          <div class="thermal-sub" id="thermal-sub"></div>
        </div>
        <div class="card fieldwork-card">
          <div class="card-heading">
            <div>
              <p class="eyebrow">Manual systems</p>
              <h2>Fieldwork</h2>
            </div>
            <span class="field-mark">FIELD 04</span>
          </div>
          <div class="fieldwork-row">
            <button class="fieldwork-btn" id="cut-btn" aria-label="Cut peat — hold, release when full">
              <span>Cut peat</span>
              <span class="fieldwork-copy">Hold, release when full</span>
              <span class="charge" aria-hidden="true"><span class="charge-fill"></span></span>
            </button>
            <div class="fieldwork-live" id="cut-live" aria-live="polite"></div>
          </div>
          <div class="fieldwork-row" id="calibration-row">
            <div class="needle-track" id="needle-track" aria-hidden="true">
              <span class="needle-zone"></span>
              <span class="needle"></span>
            </div>
            <button class="fieldwork-btn" id="calibrate-btn" aria-label="Calibrate the racks">Calibrate</button>
            <div class="fieldwork-streak" id="calibration-streak"></div>
            <div class="fieldwork-live" id="calibrate-live" aria-live="polite"></div>
          </div>
        </div>
        <div class="card prestige-card" id="prestige-card">
          <h2>Drain the Bog</h2>
          <p id="prestige-info"></p>
          <button id="prestige-btn" class="btn btn-prestige"></button>
        </div>
      </section>
      <section class="panel" data-scene="cut">
        <div class="panel-scene" aria-hidden="true"></div>
        <nav class="tabs" role="tablist" aria-label="Game panels">
          <button role="tab" data-tab="docket">${TAB_EMBLEMS.docket}<span>Docket</span></button>
          <button role="tab" data-tab="buildings">${TAB_EMBLEMS.buildings}<span>Production</span></button>
          <button role="tab" data-tab="upgrades">${TAB_EMBLEMS.upgrades}<span>Upgrades</span></button>
          <button role="tab" data-tab="research">${TAB_EMBLEMS.research}<span>Research</span></button>
          <button role="tab" data-tab="achievements">${TAB_EMBLEMS.achievements}<span>Achievements</span></button>
          <button role="tab" data-tab="charter">${TAB_EMBLEMS.charter}<span>Charter</span></button>
          <button role="tab" data-tab="settings">${TAB_EMBLEMS.settings}<span>Settings</span></button>
        </nav>
        <div class="production-filters" id="production-filters" hidden></div>
        <div class="tab-content" id="tab-content" role="tabpanel"></div>
        <div class="panel-dock" id="panel-dock">
          <div class="qty-selector" id="qty-selector" role="group" aria-label="Buy quantity">
            <span>Buy:</span>
            <button data-qty="1" aria-pressed="true">1</button>
            <button data-qty="10" aria-pressed="false">10</button>
            <button data-qty="100" aria-pressed="false">100</button>
            <button data-qty="max" aria-pressed="false">Max</button>
          </div>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <button class="sound-toggle" id="sound-toggle" type="button" aria-pressed="false" aria-label="Sound off"></button>
      <span id="save-indicator" aria-live="polite"></span>
      <span>Sector 4 · Peat Bog Trial · McFly &amp; Chronicler LLP v Burger King Nordic</span>
      <span id="field-note"></span>
    </footer>
    <div class="toasts" id="toasts" aria-live="assertive"></div>
    <div class="modal-backdrop" id="modal-backdrop" hidden>
      <div class="modal" role="dialog" aria-modal="true" id="modal"></div>
    </div>
  `;

  let activeTab: TabId = hooks.initialTab ?? 'buildings';
  let buyQty: Qty = 1;
  let productionFilter: 'all' | ProductionLine = 'all';

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;

  const sound = createSound();
  const panel = $('.panel');
  const panelScene = $('.panel-scene');
  const soundToggle = $('#sound-toggle') as HTMLButtonElement;
  const resourcesEl = $('#resources');
  const buffsEl = $('#buffs');
  const nextHint = $('#next-hint');
  const thermalText = $('#thermal-text');
  const thermalPct = $('#thermal-pct');
  const thermalFill = $('#thermal-fill');
  const thermalMeter = $('#thermal-meter');
  const thermalSub = $('#thermal-sub');
  const harvestBtn = $('#harvest-btn');
  const floatLayer = $('#float-layer');
  const clickPowerEl = $('#click-power');
  const prestigeBtn = $('#prestige-btn') as HTMLButtonElement;
  const prestigeInfo = $('#prestige-info');
  const productionFilters = $('#production-filters');
  const tabContent = $('#tab-content');
  const toasts = $('#toasts');
  const modalBackdrop = $('#modal-backdrop');
  const modal = $('#modal');
  const saveIndicator = $('#save-indicator');
  const fieldNote = $('#field-note');
  const panelDock = $('#panel-dock');
  const wisps = document.createElement('div');
  wisps.className = 'wisps';
  wisps.setAttribute('aria-hidden', 'true');
  for (const [x, y, duration, delay] of WISP_POSITIONS) {
    const wisp = document.createElement('span');
    wisp.className = 'wisp';
    wisp.style.setProperty('--x', `${x}%`);
    wisp.style.setProperty('--y', `${y}%`);
    wisp.style.setProperty('--d', `${duration}s`);
    wisp.style.setProperty('--delay', `${delay}s`);
    wisps.appendChild(wisp);
  }
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  if (!reducedMotion) root.appendChild(wisps);

  const syncSoundControls = (): void => {
    soundToggle.innerHTML = sound.enabled ? EMBLEM_SPEAKER_ON : EMBLEM_SPEAKER_OFF;
    soundToggle.setAttribute('aria-pressed', String(sound.enabled));
    soundToggle.setAttribute('aria-label', sound.enabled ? 'Sound on' : 'Sound off');
    const settingsSound = root.querySelector<HTMLInputElement>('#set-sound');
    if (settingsSound) settingsSound.checked = sound.enabled;
  };
  const syncScene = (): void => {
    const scene = TAB_SCENES[activeTab];
    root.dataset.scene = scene;
    panel.dataset.scene = scene;
    panelScene.replaceChildren();
    if (scene === 'still') {
      for (let i = 0; i < 6; i += 1) {
        const bubble = document.createElement('span');
        bubble.className = 'still-bubble';
        bubble.style.setProperty('--bubble-delay', `${-i * 1.7}s`);
        bubble.style.setProperty('--bubble-x', `${12 + i * 15}%`);
        panelScene.appendChild(bubble);
      }
    }
  };
  syncSoundControls();
  syncScene();
  panelDock.hidden = activeTab !== 'buildings';
  const cutBtn = $('#cut-btn') as HTMLButtonElement;
  const chargeFill = $('.charge-fill');
  const cutLive = $('#cut-live');
  const calibrateBtn = $('#calibrate-btn') as HTMLButtonElement;
  const needle = $('.needle');
  const needleZone = $('.needle-zone');
  const needleTrack = $('#needle-track');
  const calibrateLive = $('#calibrate-live');
  const calibrationStreak = $('#calibration-streak');
  let cutStartedAt: number | null = null;
  const MISS_COOLDOWN_MS = 5000;
  let calibrateCooldownUntil = 0;
  let lastReducedNeedleFrame = 0;
  let needleStartedAt = performance.now();
  let lastTarget = 0.5;
  const needleFrames: NeedleFrame[] = [];

  harvestBtn.addEventListener('click', () => {
    sound.play('click');
    hooks.onHarvest();
    harvestBtn.classList.remove('harvest-punch');
    void harvestBtn.offsetWidth;
    harvestBtn.classList.add('harvest-punch');
  });

  soundToggle.addEventListener('click', () => {
    sound.setEnabled(!sound.enabled);
    syncSoundControls();
    if (sound.enabled) sound.play('click');
  });

  const tabButtons = [...root.querySelectorAll<HTMLButtonElement>('.tabs [role="tab"]')];
  const activateTab = (btn: HTMLButtonElement, focus = false): void => {
    activeTab = btn.dataset.tab as TabId;
    tabButtons.forEach((tab) => {
      const selected = tab === btn;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panelDock.hidden = activeTab !== 'buildings';
    productionFilters.hidden = activeTab !== 'buildings';
    syncScene();
    forceRebuild = true;
    if (focus) btn.focus();
    if (currentState) renderLists(currentState);
  };
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn));
    btn.addEventListener('keydown', (event) => {
      const index = tabButtons.indexOf(btn);
      let nextIndex = index;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabButtons.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabButtons.length) % tabButtons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabButtons.length - 1;
      if (nextIndex === index) return;
      event.preventDefault();
      activateTab(tabButtons[nextIndex], true);
    });
  });
  tabButtons.forEach((btn) => {
    const selected = btn.dataset.tab === activeTab;
    btn.setAttribute('aria-selected', String(selected));
    btn.tabIndex = selected ? 0 : -1;
  });
  productionFilters.hidden = activeTab !== 'buildings';

  root.querySelectorAll<HTMLButtonElement>('#qty-selector [data-qty]').forEach((btn) => {
    btn.addEventListener('click', () => {
      buyQty = btn.dataset.qty === 'max' ? 'max' : Number(btn.dataset.qty);
      root.querySelectorAll('#qty-selector [data-qty]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b === btn)),
      );
      forceRebuild = true;
      if (currentState) renderLists(currentState);
    });
  });

  prestigeBtn.addEventListener('click', () => {
    sound.play('drain');
    hooks.onPrestige();
  });

  const finishCut = (now = performance.now()): void => {
    if (cutStartedAt === null) return;
    const charge = peatCutCharge(now - cutStartedAt);
    cutStartedAt = null;
    chargeFill.style.width = `${charge * 100}%`;
    const gained = hooks.onCutPeat?.(charge);
    chargeFill.style.width = '0%';
    if (typeof gained === 'number') {
      cutLive.textContent = `+${formatNumber(gained)} peat`;
    }
  };
  const startCut = (): void => {
    if (cutStartedAt !== null) return;
    cutStartedAt = performance.now();
  };
  cutBtn.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    cutBtn.setPointerCapture?.(event.pointerId);
    startCut();
  });
  cutBtn.addEventListener('pointerup', () => finishCut());
  cutBtn.addEventListener('pointercancel', () => finishCut());
  cutBtn.addEventListener('keydown', (event) => {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault();
      startCut();
    }
  });
  cutBtn.addEventListener('keyup', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      finishCut();
    }
  });
  calibrateBtn.addEventListener('click', () => {
    if (calibrateBtn.disabled) return;
    const now = performance.now();
    const drawnNeedlePos = needleAtClick(needleFrames, lastTarget, now);
    needleFrames.length = 0;
    needleStartedAt = now;
    const result = hooks.onCalibrate?.(drawnNeedlePos);
    if (result?.hit) {
      calibrateLive.textContent =
        `+${formatNumber(result.compute)} compute · streak ${result.streak} (×${formatMultiplier(result.multiplier)})`;
    } else {
      sound.play('miss');
      calibrateCooldownUntil = now + MISS_COOLDOWN_MS;
      calibrateBtn.disabled = true;
      calibrateBtn.textContent = 'Cooling down…';
      calibrateLive.textContent = 'Miss — streak reset, target recentred.';
      needleTrack.classList.remove('is-shaking');
      void needleTrack.offsetWidth;
      needleTrack.classList.add('is-shaking');
    }
  });

  let currentState: GameState | null = null;
  let forceRebuild = true;
  let renderedRows = new Map<string, HTMLElement>();
  const resourceChips = new Map<string, HTMLElement>();
  let renderedFieldNote = '';
  for (const resource of RESOURCES) {
    const chip = document.createElement('span');
    chip.className = 'res';
    chip.dataset.resource = resource.id;
    chip.innerHTML = `
      <span class="res-emoji" aria-hidden="true">${resource.emoji}</span>
      <strong></strong>
      <span class="res-name">${resource.name}</span>
      <em></em>`;
    resourcesEl.appendChild(chip);
    resourceChips.set(resource.id, chip);
  }

  function resourceAmount(state: GameState, id: string): Decimal {
    return state.wallet[id as keyof typeof state.wallet];
  }

  function formatBuffTarget(target: string): string {
    return target === 'click' ? 'clicks' : target;
  }

  function renderBuffs(state: GameState): void {
    const now = Date.now();
    buffsEl.replaceChildren();
    for (const buff of state.quests.buffs) {
      const remaining = Math.max(0, Math.ceil((buff.expiresAt - now) / 1000));
      if (remaining <= 0) continue;
      const chip = document.createElement('span');
      chip.className = 'buff-chip';
      chip.textContent = `⚡ ×${formatNumber(buff.factor)} ${formatBuffTarget(buff.target)} · ${formatClock(remaining)}`;
      buffsEl.appendChild(chip);
    }
  }

  function formatClock(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function spawnFloat(amount: Decimal | number, resource = 'broth'): void {
    const el = document.createElement('span');
    el.className = 'float-num';
    el.textContent = `+${formatNumber(amount)} ${resource}`;
    el.style.left = `${30 + Math.random() * 40}%`;
    floatLayer.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function effectiveQty(state: GameState, buildingId: string): number {
    const def = BUILDING_BY_ID[buildingId];
    const owned = state.buildings[buildingId] ?? 0;
    if (buyQty === 'max') return Math.max(1, maxAffordable(def, owned, state));
    return buyQty;
  }

  function currentDocket(state: GameState) {
    const quest = ALL_QUESTS.find((item) => !state.quests.claimed.includes(item.id));
    return quest ? {
      name: quest.name,
      progress: questProgress(state, quest),
    } : undefined;
  }

  function renderCounters(state: GameState): void {
    const rates = productionPerSecond(state);
    for (const resource of RESOURCES) {
      const chip = resourceChips.get(resource.id)!;
      const amount = resourceAmount(state, resource.id);
      const rate = resource.id === 'bogCores' ? undefined : rates[resource.id];
      const strong = chip.querySelector('strong')!;
      const em = chip.querySelector('em')!;
      strong.textContent = formatNumber(amount);
      em.textContent = rate === undefined ? '' : `+${formatNumber(rate)}/s`;
      const shouldShow = resource.id === 'broth' || resource.id === 'compute' ||
        amount.gt(0) || state.lifetime[resource.id as keyof typeof state.lifetime]?.gt(0);
      chip.hidden = !shouldShow;
    }
    const note = FIELD_NOTES[Math.floor(Date.now() / 20_000) % FIELD_NOTES.length];
    if (note !== renderedFieldNote) {
      fieldNote.textContent = note;
      renderedFieldNote = note;
    }
    const boil = Math.max(1.2, Math.min(6, 6 / Math.log10(rates.broth.toNumber() + 10)));
    harvestBtn.style.setProperty('--boil', `${boil}s`);
    renderBuffs(state);
    const next = currentDocket(state);
    const nextCurrent = next ? next.progress.current.min(next.progress.target) : 0;
    nextHint.textContent = next
      ? `Next up: ${next.name} (${formatNumber(nextCurrent)} / ${formatNumber(next.progress.target)})`
      : 'Settlement docket complete — the peat bog trial is settled.';
    clickPowerEl.textContent = formatNumber(clickPower(state));
    renderThermal(state);
    renderPrestige(state);
  }

  function renderFieldwork(state: GameState, now = performance.now()): void {
    const charge = cutStartedAt === null ? 0 : peatCutCharge(now - cutStartedAt);
    if (cutStartedAt !== null) chargeFill.style.width = `${charge * 100}%`;
    const zone = calibrationZone(state.calibrationStreak);
    needleZone.style.setProperty('--zone-left', `${(state.calibrationTarget - zone) * 100}%`);
    needleZone.style.setProperty('--zone-width', `${zone * 200}%`);
    calibrationStreak.textContent = state.calibrationStreak === 0
      ? 'Streak 0 · next hit ×1'
      : `Streak ${state.calibrationStreak} · ×${formatMultiplier(streakMultiplier(state.calibrationStreak))} → next ×${formatMultiplier(streakMultiplier(state.calibrationStreak + 1))}`;
    const reduced = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced || now - lastReducedNeedleFrame >= 250) {
      const needlePos = calibrationNeedle(now - needleStartedAt, state.calibrationStreak);
      needle.style.left = `${needlePos * 100}%`;
      needleFrames.push({ at: now, pos: needlePos });
      if (needleFrames.length > 16) needleFrames.shift();
      lastReducedNeedleFrame = now;
    }
    lastTarget = state.calibrationTarget;
    const hasRack = (state.buildings.rack ?? 0) >= 1;
    calibrateBtn.disabled = !hasRack || now < calibrateCooldownUntil;
    calibrateBtn.textContent = !hasRack
      ? 'Calibration unlocks with your first Server Rack'
      : now < calibrateCooldownUntil
        ? 'Cooling down…'
        : 'Calibrate';
    calibrateBtn.setAttribute('aria-label', calibrateBtn.textContent);
    needleTrack.hidden = !hasRack;
    if (!hasRack) {
      calibrateLive.textContent = 'Calibration unlocks with your first Server Rack.';
    }
  }

  function renderThermal(state: GameState): void {
    const heat = totalHeat(state);
    const cooling = totalCooling(state);
    const factor = thermalFactor(state);
    const pct = Math.round(factor.toNumber() * 100);
    if (heat.lte(0)) {
      thermalText.textContent = 'No heat generated';
      thermalPct.textContent = '';
      thermalSub.textContent = 'Buy Server Racks to generate compute.';
    } else {
      thermalText.textContent = `Heat ${formatNumber(heat)} / Cooling ${formatNumber(cooling)}`;
      thermalPct.textContent = `${pct}% cooled`;
      thermalSub.textContent =
        factor.gte(1)
          ? 'Racks running at full speed.'
          : 'Racks throttled — build more cooling!';
    }
    thermalFill.style.width = `${pct}%`;
    thermalFill.style.setProperty('--cooled', `${pct}%`);
    thermalFill.classList.toggle('throttled', factor.lt(1));
    thermalMeter.setAttribute('aria-valuenow', String(pct));
  }

  function renderPrestige(state: GameState): void {
    const gain = prestigeGain(state);
    const ok = canPrestige(state);
    const charterHint = state.wallet.bogCores.gt(0) ? ' Banked cores can be spent in the Charter tab.' : '';
    prestigeInfo.textContent = ok
      ? `Petition Magistrate Reino to drain the bog. Draining banks ${formatNumber(gain)} Bog Core${gain.eq(1) ? '' : 's'} (+${formatNumber(gain.mul(5))}% all production, permanent). Run resets; achievements and cores stay.${charterHint}`
      : `Petition Magistrate Reino to drain the bog. Available at ${formatNumber(1_000_000)} compute this run (${formatNumber(state.runCompute)} so far).${charterHint}`;
    prestigeBtn.disabled = !ok;
    prestigeBtn.textContent = ok ? `Drain for ${formatNumber(gain)} 💠` : 'Drain the bog';
    prestigeBtn.setAttribute(
      'aria-label',
      ok ? `Drain the bog and gain ${formatNumber(gain)} Bog Cores` : 'Drain the bog (locked)',
    );
  }

  interface RowStaticParts {
    emoji: string;
    name: string;
    desc: string;
    className?: string;
    trailingClass?: string;
    onClick?: () => void;
  }

  interface RowUpdate {
    cost?: string;
    owned?: string;
    action?: string;
    disabled?: boolean;
    label?: string;
    desc?: string;
    emoji?: string;
    status?: string;
    badge?: string;
  }

  interface RowEntry {
    key: string;
    create(): HTMLElement;
    update(row: HTMLElement): void;
  }

  function createRow(key: string, parts: RowStaticParts): HTMLElement {
    const row = parts.onClick ? document.createElement('button') : document.createElement('div');
    row.className = `item${parts.className ? ` ${parts.className}` : ''}`;
    row.dataset.key = key;
    row.innerHTML = `
        <span class="item-emoji" aria-hidden="true">${parts.emoji}</span>
        <span class="item-body">
          <span class="item-name"><span class="item-name-label">${parts.name}</span><span class="owned"></span></span>
          <span class="item-desc">${parts.desc}</span>
          <span class="item-cost"></span>
        </span>
        <span class="${parts.trailingClass ?? 'item-action'}" aria-hidden="true"></span>`;
    row.querySelector<HTMLElement>('.owned')?.addEventListener('animationend', () => {
      row.querySelector<HTMLElement>('.owned')?.classList.remove('pop');
    });
    if (parts.onClick) row.addEventListener('click', parts.onClick);
    return row;
  }

  function popRowCount(key: string): void {
    const count = tabContent.querySelector<HTMLElement>(`[data-key="${key}"] .owned`);
    if (!count) return;
    count.classList.remove('pop');
    void count.offsetWidth;
    count.classList.add('pop');
  }

  function updateRow(row: HTMLElement, update: RowUpdate): void {
    const button = row as HTMLButtonElement;
    if (update.disabled !== undefined && button.disabled !== update.disabled) {
      button.disabled = update.disabled;
    }
    if (update.label !== undefined && row.getAttribute('aria-label') !== update.label) {
      row.setAttribute('aria-label', update.label);
    }
    const emoji = row.querySelector<HTMLElement>('.item-emoji');
    if (emoji && update.emoji !== undefined && emoji.textContent !== update.emoji) {
      emoji.textContent = update.emoji;
    }
    const desc = row.querySelector<HTMLElement>('.item-desc');
    if (desc && update.desc !== undefined && desc.textContent !== update.desc) {
      desc.textContent = update.desc;
    }
    const cost = row.querySelector<HTMLElement>('.item-cost');
    const costText = update.cost ?? '';
    if (cost && cost.textContent !== costText) cost.textContent = costText;
    const owned = row.querySelector<HTMLElement>('.owned');
    const ownedText = update.owned ?? '';
    if (owned && owned.textContent !== ownedText) owned.textContent = ownedText;
    const action = row.querySelector<HTMLElement>('.item-action, .docket-badge, .quest-action');
    const actionText = update.action ?? update.badge ?? '';
    if (action && action.textContent !== actionText) action.textContent = actionText;
    if (update.status !== undefined && row.dataset.status !== update.status) {
      for (const status of ['done', 'current', 'upcoming', 'locked', 'unlocked']) {
        row.classList.remove(status);
      }
      row.classList.add(update.status);
      row.dataset.status = update.status;
    }
  }

  function reconcileRows(entries: RowEntry[]): void {
    const keys = entries.map((entry) => entry.key);
    const keySignature = keys.join('|');
    const shouldRebuild =
      forceRebuild ||
      tabContent.dataset.tab !== activeTab ||
      tabContent.dataset.keys !== keySignature;
    if (shouldRebuild) {
      const wasOwnedDrawerOpen = Boolean(
        tabContent.querySelector<HTMLDetailsElement>('.owned-drawer')?.open,
      );
      const frag = document.createDocumentFragment();
      renderedRows = new Map<string, HTMLElement>();
      for (const entry of entries) {
        const row = entry.create();
        row.dataset.key = entry.key;
        entry.update(row);
        renderedRows.set(entry.key, row);
        frag.appendChild(row);
      }
      tabContent.replaceChildren(frag);
      if (wasOwnedDrawerOpen) {
        tabContent.querySelector<HTMLDetailsElement>('.owned-drawer')?.setAttribute('open', '');
      }
      tabContent.dataset.tab = activeTab;
      tabContent.dataset.keys = keySignature;
      forceRebuild = false;
      return;
    }
    for (const entry of entries) {
      const row = renderedRows.get(entry.key);
      if (row) entry.update(row);
    }
  }

  const productionCategories = [...new Set(BUILDINGS.map((def) => def.line))] as ProductionLine[];
  function renderProductionFilters(state: GameState, rates = productionPerSecond(state)): void {
    if (!productionFilters.firstElementChild) {
      const wrap = document.createElement('div');
      wrap.className = 'filter-tabs';
      wrap.setAttribute('role', 'tablist');
      wrap.setAttribute('aria-label', 'Filter by output');
      const pill = document.createElement('span');
      pill.className = 'filter-pill';
      pill.setAttribute('aria-hidden', 'true');
      wrap.appendChild(pill);
      const filters: ('all' | ProductionLine)[] = ['all', ...productionCategories];
      for (const filter of filters) {
        const button = document.createElement('button');
        button.className = 'filter-tab';
        button.dataset.filter = filter;
        button.setAttribute('role', 'tab');
        button.addEventListener('click', () => {
          productionFilter = filter;
          forceRebuild = true;
          if (currentState) renderLists(currentState);
        });
        wrap.appendChild(button);
      }
      productionFilters.appendChild(wrap);
    }
    const visibleCategories = new Set(
      productionCategories.filter((category) =>
        BUILDINGS.some((def) => def.line === category && buildingVisible(state, def, rates)),
      ),
    );
    productionFilters.querySelectorAll<HTMLButtonElement>('.filter-tab').forEach((button) => {
      const filter = button.dataset.filter as typeof productionFilter;
      const visible = filter === 'all' || filter === 'broth' || visibleCategories.has(filter);
      button.hidden = !visible;
      button.textContent = filter[0].toUpperCase() + filter.slice(1);
      button.setAttribute('aria-selected', String(productionFilter === filter));
      button.tabIndex = productionFilter === filter ? 0 : -1;
    });
    const pill = productionFilters.querySelector<HTMLElement>('.filter-pill');
    const active = productionFilters.querySelector<HTMLElement>(`[data-filter="${productionFilter}"]`);
    if (pill && active) {
      pill.style.transform = `translateX(${active.offsetLeft}px)`;
      pill.style.width = `${active.offsetWidth}px`;
    }
  }

  function renderBuildings(state: GameState): void {
    const entries: RowEntry[] = [];
    const categories = productionCategories;
    const rates = productionPerSecond(state);
    renderProductionFilters(state, rates);
    for (const category of categories) {
      if (productionFilter !== 'all' && productionFilter !== category) continue;
      const categoryBuildings = BUILDINGS.filter((def) => def.line === category);
      const visible = categoryBuildings.filter((def) => buildingVisible(state, def, rates));
      const nextLocked = categoryBuildings.find((def) => !buildingVisible(state, def, rates));
      if ((visible.length > 0 || nextLocked) && productionFilter === 'all') {
        entries.push({
          key: `heading-${category}`,
          create: () => createSectionHeading(category[0].toUpperCase() + category.slice(1)),
          update: () => {},
        });
      }
      for (const def of visible) {
        const desc = (): string => {
          const perUnit: string[] = [];
          for (const [resource, amount] of Object.entries(def.produces ?? {})) {
            perUnit.push(`+${formatNumber(amount)} ${RESOURCES.find((item) => item.id === resource)?.name ?? resource}/s`);
          }
          if (def.cooling) perUnit.push(`+${formatNumber(def.cooling)} cooling`);
          if (def.heat) perUnit.push(`${formatNumber(def.heat)} heat`);
          return `${def.description} ${perUnit.join(', ')}.`;
        };
        entries.push({
          key: def.id,
          create: () =>
            createRow(def.id, {
              emoji: def.emoji,
              name: def.name,
              desc: desc(),
              onClick: () => {
                const latest = currentState;
                if (!latest) return;
                const qty = effectiveQty(latest, def.id);
                if (buyBuilding(latest, def.id, qty)) {
                  sound.play('buy');
                  renderLists(latest);
                  popRowCount(def.id);
                }
              },
            }),
          update: (row) => {
            const latest = currentState ?? state;
            const owned = latest.buildings[def.id] ?? 0;
            const qty = effectiveQty(latest, def.id);
            const cost = bulkCost(def, owned, qty, latest);
            updateRow(row, {
              cost: formatCost(cost),
              owned: `×${owned}`,
              action: `Buy ×${qty}`,
              disabled: !canAfford(latest, cost),
              label: `Buy ${qty} ${def.name} for ${formatCost(cost)}`,
              desc: desc(),
            });
          },
        });
      }
      if (nextLocked) {
        const rateThreshold = Object.entries(nextLocked.unlock?.rate ?? {})
          .map(([resource, amount]) => `${formatNumber(amount)} ${RESOURCES.find((item) => item.id === resource)?.name ?? resource}/s`);
        const lifetimeThreshold = Object.entries(nextLocked.unlock?.lifetime ?? {})
          .map(([resource, amount]) => `${formatNumber(amount)} lifetime ${RESOURCES.find((item) => item.id === resource)?.name ?? resource}`);
        const threshold = [...rateThreshold, ...lifetimeThreshold].join(' and ');
        entries.push({
          key: `locked-${nextLocked.id}`,
          create: () =>
            createRow(`locked-${nextLocked.id}`, {
              emoji: '🔒',
              name: 'Next blueprint',
              desc: `Unlocks at ${threshold}`,
              className: 'locked-teaser',
            }),
          update: (row) => updateRow(row, { status: 'locked', desc: `Unlocks at ${threshold}` }),
        });
      }
    }
    reconcileRows(entries);
  }

  function createQuestRow(questId: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'item quest-row';
    row.dataset.key = questId;
    row.innerHTML = `
      <span class="item-emoji" aria-hidden="true"></span>
      <span class="item-body">
        <span class="item-name"><span class="item-name-label"></span></span>
        <span class="item-desc"></span>
        <span class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span class="progress-fill"></span></span>
        <span class="quest-progress"></span>
        <span class="quest-reward"></span>
      </span>
      <span class="quest-action item-action"></span>`;
    return row;
  }

  function renderDocket(state: GameState): void {
    const chapters = ['discovery', 'litigation', 'verdict', 'keepers', 'works', 'appeals'] as const;
    const chapterLabels: Record<(typeof chapters)[number], string> = {
      discovery: 'Discovery',
      litigation: 'Litigation',
      verdict: 'Verdict',
      keepers: 'Keepers of the Bog',
      works: 'The Works',
      appeals: 'Appeals',
    };
    const entries: RowEntry[] = [];
    for (const chapter of chapters) {
      const quests = ALL_QUESTS.filter((quest) => quest.chapter === chapter);
      const claimed = quests.filter((quest) => state.quests.claimed.includes(quest.id)).length;
      entries.push({
        key: `chapter-${chapter}`,
        create: () => createSectionHeading(`${chapterLabels[chapter]} · ${claimed}/${quests.length} claimed`),
        update: (row) => {
          row.textContent = `${chapterLabels[chapter]} · ${claimed}/${quests.length} claimed`;
        },
      });
      for (const quest of quests) {
        entries.push({
          key: quest.id,
          create: () => createQuestRow(quest.id),
          update: (row) => {
            const done = state.quests.claimed.includes(quest.id);
            const progress = questProgress(state, quest);
            const ready = !done && questReady(state, quest);
            row.classList.toggle('ready', ready);
            row.classList.toggle('claimed', done);
            row.querySelector<HTMLElement>('.item-emoji')!.textContent = quest.emoji;
            row.querySelector<HTMLElement>('.item-name-label')!.textContent = quest.name;
            row.querySelector<HTMLElement>('.item-desc')!.textContent = quest.brief;
            const bar = row.querySelector<HTMLElement>('.progress')!;
            bar.setAttribute('aria-valuenow', String(Math.round(progress.fraction * 100)));
            bar.setAttribute('aria-label', `${quest.name} progress`);
            const fill = bar.querySelector<HTMLElement>('.progress-fill') ??
              (() => {
                const element = document.createElement('span');
                element.className = 'progress-fill';
                bar.appendChild(element);
                return element;
            })();
            fill.style.width = `${progress.fraction * 100}%`;
            const current = progress.current.min(progress.target);
            row.querySelector<HTMLElement>('.quest-progress')!.textContent =
              `${formatNumber(current)} / ${formatNumber(progress.target)}`;
            row.querySelector<HTMLElement>('.quest-reward')!.textContent =
              `Reward: ${formatQuestReward(quest.reward)}`;
            const action = row.querySelector<HTMLElement>('.quest-action')!;
            action.replaceChildren();
            if (done) {
              action.textContent = 'Claimed ✓';
              action.classList.add('claimed-badge', 't-success-check');
              action.dataset.state = 'in';
            } else if (ready) {
              action.classList.remove('claimed-badge');
              const button = document.createElement('button');
              button.className = `btn ${quest.chapter === 'discovery' || quest.chapter === 'litigation' || quest.chapter === 'verdict' || quest.chapter === 'keepers' ? 'quest-claim' : 'quest-story-claim'}`;
              button.textContent = 'Claim';
              button.setAttribute('aria-label', `Claim ${quest.name}`);
              button.addEventListener('click', () => {
                const latest = currentState;
                if (!latest) return;
                const reward = hooks.onClaimQuest?.(quest.id) ??
                  claimQuest(latest, quest.id);
                if (!reward) return;
                sound.play('claim');
                toast(`Filed: ${quest.name} — ${formatQuestReward(reward)}`);
                renderCounters(latest);
                renderLists(latest);
                const claimedAction = tabContent.querySelector<HTMLElement>(`[data-key="${quest.id}"] .quest-action`);
                if (claimedAction) claimedAction.insertAdjacentHTML('afterbegin', SUCCESS_CHECK);
              });
              action.appendChild(button);
            } else {
              action.classList.remove('claimed-badge');
              action.textContent = ' ';
            }
          },
        });
      }
    }
    entries.push({
      key: 'chapter-bounties',
      create: () => createSectionHeading(`Bounties · ${BOUNTIES.reduce((sum, bounty) => sum + (state.quests.bountyCount[bounty.id] ?? 0), 0)} completed`),
      update: (row) => {
        const completed = BOUNTIES.reduce((sum, bounty) => sum + (state.quests.bountyCount[bounty.id] ?? 0), 0);
        row.textContent = `Bounties · ${completed} completed`;
      },
    });
    for (const bounty of BOUNTIES) {
      entries.push({
        key: bounty.id,
        create: () => createQuestRow(bounty.id),
        update: (row) => {
          acceptBounty(state, bounty.id);
          const instance = bountyInstance(state, bounty.id);
          const progress = bountyProgress(state, bounty.id);
          const ready = progress.current.gte(progress.target);
          row.classList.toggle('ready', ready);
          row.classList.remove('claimed');
          row.querySelector<HTMLElement>('.item-emoji')!.textContent = bounty.emoji;
          row.querySelector<HTMLElement>('.item-name-label')!.textContent = `${bounty.name} ×${instance}`;
          row.querySelector<HTMLElement>('.item-desc')!.textContent = bounty.brief(instance);
          const bar = row.querySelector<HTMLElement>('.progress')!;
          bar.setAttribute('aria-valuenow', String(Math.round(progress.fraction * 100)));
          bar.setAttribute('aria-label', `${bounty.name} progress`);
          bar.querySelector<HTMLElement>('.progress-fill')!.style.width = `${progress.fraction * 100}%`;
          row.querySelector<HTMLElement>('.quest-progress')!.textContent =
            `${formatNumber(progress.current.min(progress.target))} / ${formatNumber(progress.target)}`;
          row.querySelector<HTMLElement>('.quest-reward')!.textContent =
            `Reward: ${formatQuestReward(bounty.reward(instance))}`;
          const action = row.querySelector<HTMLElement>('.quest-action')!;
          action.replaceChildren();
          const button = document.createElement('button');
          button.className = 'btn quest-bounty-claim';
          button.textContent = ready ? 'Claim' : 'In progress';
          button.disabled = !ready;
          button.setAttribute('aria-label', `${ready ? 'Claim' : 'View'} ${bounty.name} ×${instance}`);
          button.addEventListener('click', () => {
            const latest = currentState;
            if (!latest) return;
            const reward = claimBounty(latest, bounty.id);
            if (!reward) return;
            sound.play('claim');
            toast(`Filed: ${bounty.name} — ${formatQuestReward(reward)}`);
            renderCounters(latest);
            renderLists(latest);
          });
          action.appendChild(button);
        },
      });
    }
    reconcileRows(entries);
  }

  function createSectionHeading(label: string): HTMLElement {
    const heading = document.createElement('div');
    heading.className = 'section-heading';
    heading.textContent = label;
    return heading;
  }

  function requirementGap(state: GameState, upgrade: (typeof UPGRADES)[number]): number {
    return (upgrade.requires ?? []).reduce(
      (gap, requirement) =>
        gap + Math.max(0, requirement.count - (state.buildings[requirement.buildingId] ?? 0)),
      0,
    );
  }

  function requirementsText(state: GameState, upgrade: (typeof UPGRADES)[number]): string {
    return (upgrade.requires ?? [])
      .map((requirement) => {
        const building = BUILDING_BY_ID[requirement.buildingId];
        const count = state.buildings[requirement.buildingId] ?? 0;
        const remaining = Math.max(0, requirement.count - count);
        return `Needs ${remaining} more ${pluralize(remaining, building.name)}`;
      })
      .join(' and ');
  }

  function unlockThresholdText(upgrade: (typeof UPGRADES)[number]): string {
    const thresholds: string[] = [];
    for (const [resource, amount] of Object.entries(upgrade.cost)) {
      if (amount !== undefined) thresholds.push(`${formatNumber(amount * 0.1)} ${resource}`);
    }
    return `Unlocks after earning ${thresholds.join(' and ')}`;
  }

  function upcomingText(state: GameState, upgrade: (typeof UPGRADES)[number]): string {
    return upgrade.requires?.length ? requirementsText(state, upgrade) : unlockThresholdText(upgrade);
  }

  function createOwnedDrawerEntry(): RowEntry {
    return {
      key: 'owned-drawer',
      create: () => {
        const drawer = document.createElement('details');
        drawer.className = 'owned-drawer';
        drawer.innerHTML = '<summary></summary><div class="owned-grid"></div>';
        return drawer;
      },
      update: (row) => {
        const latest = currentState;
        if (!latest) return;
        const summary = row.querySelector('summary');
        const grid = row.querySelector<HTMLElement>('.owned-grid');
        if (!summary || !grid) return;
        const countText = `Owned upgrades · ${latest.upgrades.length}`;
        if (summary.textContent !== countText) summary.textContent = countText;
        for (const id of latest.upgrades) {
          if (grid.querySelector(`[data-upgrade-id="${id}"]`)) continue;
          const upgrade = UPGRADE_BY_ID[id];
          if (!upgrade) continue;
          const tile = document.createElement('span');
          tile.className = 'owned-tile';
          tile.dataset.upgradeId = id;
          tile.setAttribute('role', 'img');
          tile.setAttribute('aria-label', `${upgrade.name}: ${upgrade.description}`);
          tile.title = `${upgrade.name} — ${upgrade.description}`;
          tile.textContent = upgrade.emoji;
          grid.appendChild(tile);
        }
      },
    };
  }

  function createUpgradeEntry(
    upgrade: (typeof UPGRADES)[number],
    state: GameState,
    upcoming = false,
  ): RowEntry {
    return {
      key: upcoming ? `soon-${upgrade.id}` : upgrade.id,
      create: () =>
        createRow(upcoming ? `soon-${upgrade.id}` : upgrade.id, {
          emoji: upgrade.emoji,
          name: upgrade.name,
          desc: upcoming ? upcomingText(state, upgrade) : upgrade.description,
          className: upcoming ? 'upcoming-upgrade' : undefined,
          onClick: upcoming
            ? undefined
            : () => {
                const latest = currentState;
                if (latest && buyUpgrade(latest, upgrade.id)) {
                  sound.play('buy');
                  renderLists(latest);
                  popRowCount(upgrade.id);
                }
              },
        }),
      update: (row) => {
        const latest = currentState ?? state;
        const isOwned = latest.upgrades.includes(upgrade.id);
        updateRow(row, {
          cost: upcoming ? '' : formatCost(upgrade.cost),
          owned: isOwned ? '✓ owned' : '',
          action: upcoming ? '' : isOwned ? '' : 'Buy',
          disabled: upcoming ? undefined : isOwned || !canAfford(latest, upgrade.cost),
          label: upcoming
            ? `${upgrade.name} (locked)`
            : isOwned
              ? `${upgrade.name} (owned)`
              : `Buy upgrade ${upgrade.name} for ${formatCost(upgrade.cost)}`,
          desc: upcoming ? upcomingText(latest, upgrade) : upgrade.description,
        });
      },
    };
  }

  function createNightWatchEntry(state: GameState): RowEntry {
    return {
      key: 'night-watch',
      create: () => createRow('night-watch', {
        emoji: '🕯️',
        name: 'Night Watch',
        desc: '',
        onClick: () => {
          const latest = currentState;
          if (!latest) return;
          const bought = hooks.onBuyNightWatch
            ? hooks.onBuyNightWatch()
            : buyNightWatch(latest);
          if (bought) {
            sound.play('buy');
            renderLists(latest);
            popRowCount('night-watch');
          }
        },
      }),
      update: (row) => {
        const latest = currentState ?? state;
        const breakdown = offlineRateBreakdown(latest);
        const level = latest.nightWatch;
        const atMax = level >= 49;
        const next = atMax ? '' : ` Next level: +1%.`;
        const charterText = breakdown.charter > 0 ? ` + Charter ${formatNumber(breakdown.charter * 100)}%` : '';
        const description = `While you are away the cutters keep ${formatNumber(breakdown.total * 100)}% of production going (base 1% + Night Watch ${formatNumber(breakdown.nightWatch * 100)}%${charterText}).${next}`;
        updateRow(row, {
          cost: atMax ? '' : formatCost(nightWatchCost(level)),
          owned: `Lv ${level}/49`,
          action: atMax ? 'Maxed' : 'Buy',
          disabled: atMax || !canAfford(latest, nightWatchCost(level)),
          label: atMax ? 'Night Watch maxed' : `Buy Night Watch level ${level + 1}`,
          desc: description,
        });
      },
    };
  }

  function renderUpgrades(state: GameState): void {
    const owned = new Set(state.upgrades);
    const available = UPGRADES
      .filter((u) => !owned.has(u.id) && upgradeVisible(state, u))
      .sort((a, b) => (a.cost.broth ?? 0) - (b.cost.broth ?? 0) || (a.cost.compute ?? 0) - (b.cost.compute ?? 0));
    const upcoming = UPGRADES
      .filter((u) => {
        if (owned.has(u.id) || upgradeVisible(state, u)) return false;
        return (u.requires ?? []).every(({ buildingId }) => {
          const building = BUILDING_BY_ID[buildingId];
          return building && buildingVisible(state, building);
        });
      })
      .sort((a, b) => {
        const aHasRequirements = Boolean(a.requires?.length);
        const bHasRequirements = Boolean(b.requires?.length);
        if (aHasRequirements !== bHasRequirements) return aHasRequirements ? -1 : 1;
        if (aHasRequirements) return requirementGap(state, a) - requirementGap(state, b);
        return (a.cost.broth ?? 0) - (b.cost.broth ?? 0) ||
          (a.cost.compute ?? 0) - (b.cost.compute ?? 0);
      })
      .slice(0, 6);
    const entries: RowEntry[] = [createNightWatchEntry(state)];
    if (owned.size > 0) entries.push(createOwnedDrawerEntry());
    if (available.length > 0) {
      entries.push({
        key: 'available-heading',
        create: () => createSectionHeading('Available'),
        update: () => {},
      });
    }
    entries.push(...available.map((u) => createUpgradeEntry(u, state)));
    if (upcoming.length > 0) {
      entries.push({
        key: 'upcoming-heading',
        create: () => createSectionHeading('Upcoming'),
        update: () => {},
      });
      entries.push(...upcoming.map((u) => createUpgradeEntry(u, state, true)));
    }
    if (entries.length === 0) {
      entries.push({
        key: 'empty',
        create: () => emptyNote('No upgrades yet — buy buildings to unlock them.'),
        update: () => {},
      });
    }
    reconcileRows(entries);
  }

  function renderResearch(state: GameState): void {
    const queued = state.researchQueue;
    const entries: RowEntry[] = [];
    entries.push({
      key: 'research-progress-heading',
      create: () => createSectionHeading(`In progress · ${queued.length} / ${maxResearchQueue(state)} slots`),
      update: (row) => {
        row.textContent = `In progress · ${state.researchQueue.length} / ${maxResearchQueue(state)} slots`;
      },
    });
    for (const entry of queued) {
      const research = RESEARCH.find((item) => item.id === entry.id);
      if (!research) continue;
      entries.push({
        key: `queue-${entry.id}`,
        create: () => {
          const row = createResearchRow(entry.id, true);
          row.querySelector<HTMLButtonElement>('.research-cancel')?.addEventListener('click', () => {
            if (currentState && hooks.onCancelResearch?.(entry.id) !== false) renderLists(currentState);
          });
          return row;
        },
        update: (row) => updateResearchRow(row, research, state, true),
      });
    }
    const branches: ResearchBranch[] = ['thermal', 'extraction', 'distillation', 'litigation', 'celestial'];
    for (const branch of branches) {
      const branchResearch = RESEARCH.filter((research) => researchBranch(research.id) === branch);
      entries.push({
        key: `research-branch-${branch}`,
        create: () => {
          const heading = document.createElement('div');
          heading.className = 'research-branch-heading';
          heading.innerHTML = `<strong>${RESEARCH_BRANCHES[branch].name}</strong><span>${RESEARCH_BRANCHES[branch].blurb}</span>`;
          return heading;
        },
        update: (row) => {
          row.querySelector('strong')!.textContent = RESEARCH_BRANCHES[branch].name;
          row.querySelector('span')!.textContent = RESEARCH_BRANCHES[branch].blurb;
        },
      });
      for (const research of branchResearch) {
        entries.push({
          key: `catalog-${research.id}`,
          create: () => {
            const row = createResearchRow(research.id, false);
            row.querySelector<HTMLButtonElement>('.research-cancel')!.addEventListener('click', () => {
              const latest = currentState;
              if (!latest) return;
              if (latest.researchQueue.some((entry) => entry.id === research.id)) {
                if (hooks.onCancelResearch?.(research.id) !== false) renderLists(latest);
                return;
              }
              if (!latest.research.includes(research.id) &&
                hooks.onQueueResearch?.(research.id) !== false) {
                if (!hooks.onQueueResearch) buyResearch(latest, research.id);
                renderLists(latest);
              }
            });
            return row;
          },
          update: (row) => {
            const done = state.research.includes(research.id);
            const queuedEntry = state.researchQueue.some((entry) => entry.id === research.id);
            const prerequisitesMet = (research.requires ?? []).every((required) => state.research.includes(required));
            const available = !done && !queuedEntry && prerequisitesMet;
            const status = done ? 'done' : queuedEntry ? 'queued' : available ? 'available' : 'locked';
            updateResearchRow(row, research, state, queuedEntry, status);
          },
        });
      }
    }
    const completed = RESEARCH.filter((research) => state.research.includes(research.id));
    if (completed.length > 0) {
      entries.push({
        key: 'completed-research',
        create: () => {
          const drawer = document.createElement('details');
          drawer.className = 'owned-drawer completed-drawer';
          drawer.innerHTML = '<summary></summary><div class="owned-grid"></div>';
          return drawer;
        },
        update: (row) => {
          row.querySelector('summary')!.textContent = `Completed research · ${completed.length}`;
          const grid = row.querySelector<HTMLElement>('.owned-grid')!;
          for (const research of completed) {
            if (grid.querySelector(`[data-research-id="${research.id}"]`)) continue;
            const tile = document.createElement('span');
            tile.className = 'owned-tile';
            tile.dataset.researchId = research.id;
            tile.setAttribute('role', 'img');
            tile.setAttribute('aria-label', `${research.name}: ${research.description}`);
            tile.title = `${research.name} — ${research.description}`;
            tile.textContent = research.emoji;
            grid.appendChild(tile);
          }
        },
      });
    }
    reconcileRows(entries);
  }

  function createResearchRow(id: string, queued: boolean): HTMLElement {
    const row = document.createElement('div');
    row.className = 'item research-row';
    row.dataset.key = queued ? `queue-${id}` : id;
    row.innerHTML = `
      <span class="item-emoji" aria-hidden="true"></span>
      <span class="item-body">
        <span class="item-name"><span class="item-name-label"></span></span>
        <span class="item-desc"></span>
        <span class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"><span class="progress-fill"></span></span>
      </span>
      <span class="research-meta"><span class="research-state"></span><span class="research-remaining"></span><button class="btn research-cancel">Queue</button></span>`;
    return row;
  }

  function updateResearchRow(
    row: HTMLElement,
    research: (typeof RESEARCH)[number],
    state: GameState,
    queued: boolean,
    status: 'done' | 'queued' | 'available' | 'locked' = queued ? 'queued' : 'available',
  ): void {
    row.querySelector<HTMLElement>('.item-emoji')!.textContent = research.emoji;
    row.querySelector<HTMLElement>('.item-name-label')!.textContent = research.name;
    const prerequisites = (research.requires ?? [])
      .map((id) => RESEARCH_BY_ID[id]?.name ?? id)
      .join(', ');
    const prerequisiteText = prerequisites ? ` Requires: ${prerequisites}.` : '';
    row.querySelector<HTMLElement>('.item-desc')!.textContent =
      `${research.description} ${describeResearchEffect(research.effect)}.${prerequisiteText}`;
    const bar = row.querySelector<HTMLElement>('.progress')!;
    const progress = researchProgress(state, research.id);
    const fraction = progress?.fraction ?? 0;
    bar.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
    bar.setAttribute('aria-label', `${research.name} progress`);
    bar.querySelector<HTMLElement>('.progress-fill')!.style.width = `${fraction * 100}%`;
    const remaining = row.querySelector<HTMLElement>('.research-remaining')!;
    remaining.textContent = progress ? formatDuration(progress.remaining) : '';
    const stateLabel = row.querySelector<HTMLElement>('.research-state')!;
    stateLabel.textContent = status;
    row.dataset.status = status;
    const action = row.querySelector<HTMLButtonElement>('.research-cancel')!;
    const queueFull = status === 'available' && state.researchQueue.length >= maxResearchQueue(state);
    action.textContent = status === 'queued' ? 'Cancel' : queueFull ? 'Queue full' : status === 'available' ? 'Queue' : status;
    action.disabled = (status !== 'available' && status !== 'queued') || queueFull;
    action.hidden = status === 'done';
    action.setAttribute('aria-label', status === 'available' ? `Queue ${research.name}` : `${research.name} ${status}`);
  }

  function renderAchievements(state: GameState): void {
    const entries: RowEntry[] = ACHIEVEMENTS.map((a) => ({
      key: a.id,
      create: () =>
        createRow(a.id, {
          emoji: state.achievements.includes(a.id) ? a.emoji : '🔒',
          name: a.name,
          desc: `${a.description} <em>+1% all production</em>`,
          className: 'achievement',
        }),
      update: (row) => {
        const done = state.achievements.includes(a.id);
        updateRow(row, {
          emoji: done ? a.emoji : '🔒',
          status: done ? 'unlocked' : 'locked',
        });
      },
    }));
    reconcileRows(entries);
  }

  function charterNodeDescription(state: GameState, node: CharterNodeDef): string {
    if (node.requires && !state.charter.includes(node.requires)) {
      const parent = CHARTER_BY_ID[node.requires];
      return `Requires ${parent?.name ?? node.requires}`;
    }
    if (node.requiresAny && !node.requiresAny.some((id) => state.charter.includes(id))) {
      const names = node.requiresAny.map((id) => CHARTER_BY_ID[id]?.name ?? id).join(' or ');
      return `Requires ${names}`;
    }
    return node.description;
  }

  type CharterNodeState = 'locked' | 'purchasable' | 'unaffordable' | 'signed';
  function charterNodeState(state: GameState, node: CharterNodeDef): CharterNodeState {
    if (state.charter.includes(node.id)) return 'signed';
    if (node.requires && !state.charter.includes(node.requires)) return 'locked';
    if (node.requiresAny && !node.requiresAny.some((id) => state.charter.includes(id))) return 'locked';
    return charterAvailable(state, node) ? 'purchasable' : 'unaffordable';
  }

  const CHARTER_STATE_LABEL: Record<CharterNodeState, string> = {
    locked: 'Locked',
    purchasable: 'Ready to sign',
    unaffordable: 'Not enough cores',
    signed: 'Signed',
  };

  let charterSelected: string = CHARTER_ROOT_ID;
  let charterView: CharterView | null = null;
  let charterInteracted = false;

  function signCharter(node: CharterNodeDef): void {
    const latest = currentState;
    if (!latest || charterNodeState(latest, node) !== 'purchasable') return;
    const bought = hooks.onBuyCharter ? hooks.onBuyCharter(node.id) : buyCharter(latest, node.id);
    if (!bought) return;
    sound.play('claim');
    toast(`Charter signed: ${node.name}`);
    renderCounters(latest);
    renderLists(latest);
    const signed = tabContent.querySelector<HTMLButtonElement>('.charter-sign');
    if (signed) signed.insertAdjacentHTML('afterbegin', SUCCESS_CHECK);
  }

  function charterViewport(canvas: HTMLElement): { width: number; height: number } {
    return { width: canvas.clientWidth, height: canvas.clientHeight };
  }

  function setCharterView(
    canvas: HTMLElement,
    sheet: HTMLElement,
    layout: ReturnType<typeof layoutCharter>,
    next: CharterView,
    interacted = true,
  ): void {
    const viewport = charterViewport(canvas);
    if (viewport.width === 0 || viewport.height === 0) return;
    charterView = clampPan(next, { width: layout.width, height: layout.height }, viewport);
    if (interacted) charterInteracted = true;
    sheet.style.transform = toCss(charterView);
    const zoomIn = canvas.querySelector<HTMLButtonElement>('[data-zoom="in"]');
    const zoomOut = canvas.querySelector<HTMLButtonElement>('[data-zoom="out"]');
    if (zoomIn) zoomIn.disabled = charterView.scale >= CHARTER_MAX_SCALE;
    if (zoomOut) zoomOut.disabled = charterView.scale <= CHARTER_MIN_SCALE;
  }

  function setupCharterCamera(
    canvas: HTMLElement,
    sheet: HTMLElement,
    toolbar: HTMLElement,
    layout: ReturnType<typeof layoutCharter>,
  ): void {
    const viewport = charterViewport(canvas);
    const centre = (): void => {
      const size = charterViewport(canvas);
      if (size.width === 0 || size.height === 0) return;
      if (!charterView || !charterInteracted) {
        setCharterView(canvas, sheet, layout, centreOn(layout.points[CHARTER_ROOT_ID], size, 1), false);
      } else {
        setCharterView(canvas, sheet, layout, charterView, false);
      }
    };
    const ensureView = (): void => {
      if (!charterView && canvas.clientWidth > 0 && canvas.clientHeight > 0) centre();
    };
    if (viewport.width > 0 && viewport.height > 0) centre();
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(centre).observe(canvas);
    } else {
      requestAnimationFrame(centre);
    }

    const pointers = new Map<number, { x: number; y: number }>();
    const starts = new Map<number, { x: number; y: number }>();
    let dragging = false;
    let previousPinch: { midpoint: { x: number; y: number }; distance: number } | null = null;
    const canCapture = 'setPointerCapture' in canvas;
    const pairSnapshot = (): { midpoint: { x: number; y: number }; distance: number } | null => {
      const points = [...pointers.values()];
      if (points.length < 2) return null;
      const [a, b] = points;
      return {
        midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        distance: Math.hypot(a.x - b.x, a.y - b.y),
      };
    };
    const canvasPoint = (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };
    const markDragging = (): void => {
      dragging = true;
      canvas.classList.add('is-panning');
    };
    const applyPan = (next: CharterView): void => {
      setCharterView(canvas, sheet, layout, next);
    };

    toolbar.addEventListener('pointerdown', (event) => event.stopPropagation());
    toolbar.querySelectorAll<HTMLButtonElement>('.charter-zoom-btn').forEach((button) => {
      button.addEventListener('click', () => {
        ensureView();
        const current = charterView;
        if (!current) return;
        const size = charterViewport(canvas);
        const pivot = { x: size.width / 2, y: size.height / 2 };
        if (button.dataset.zoom === 'reset') {
          applyPan(centreOn(layout.points[CHARTER_ROOT_ID], size, 1));
        } else {
          const factor = button.dataset.zoom === 'in' ? CHARTER_ZOOM_STEP : 1 / CHARTER_ZOOM_STEP;
          applyPan(zoomAt(current, factor, pivot));
        }
      });
    });

    canvas.addEventListener('pointerdown', (event) => {
      ensureView();
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      starts.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (canCapture) canvas.setPointerCapture(event.pointerId);
      if (pointers.size >= 2) {
        previousPinch = pairSnapshot();
        markDragging();
      }
    });
    canvas.addEventListener('pointermove', (event) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const beforePinch = pointers.size >= 2 ? pairSnapshot() : null;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2) {
        const afterPinch = pairSnapshot();
        const prior = previousPinch ?? beforePinch;
        if (afterPinch && prior && prior.distance > 0 && charterView) {
          const pivot = canvasPoint(afterPinch.midpoint.x, afterPinch.midpoint.y);
          const zoomed = zoomAt(charterView, afterPinch.distance / prior.distance, pivot);
          applyPan(panBy(
            zoomed,
            afterPinch.midpoint.x - prior.midpoint.x,
            afterPinch.midpoint.y - prior.midpoint.y,
          ));
        }
        previousPinch = afterPinch;
        markDragging();
        return;
      }
      const start = starts.get(event.pointerId);
      if (!start) return;
      if (!dragging && Math.hypot(event.clientX - start.x, event.clientY - start.y) > CHARTER_DRAG_THRESHOLD_PX) {
        markDragging();
      }
      if (dragging && charterView) {
        applyPan(panBy(charterView, event.clientX - previous.x, event.clientY - previous.y));
      }
    });
    const endPointer = (event: PointerEvent): void => {
      pointers.delete(event.pointerId);
      starts.delete(event.pointerId);
      previousPinch = pointers.size >= 2 ? pairSnapshot() : null;
      if (pointers.size > 0) return;
      if (dragging) {
        canvas.addEventListener('click', (click) => {
          click.stopPropagation();
          click.preventDefault();
        }, { capture: true, once: true });
      }
      dragging = false;
      canvas.classList.remove('is-panning');
    };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      ensureView();
      if (!charterView) return;
      applyPan(zoomAt(charterView, wheelZoomFactor(event.deltaY), canvasPoint(event.clientX, event.clientY)));
    }, { passive: false });
    canvas.addEventListener('keydown', (event) => {
      if (event.target !== canvas) return;
      ensureView();
      if (!charterView) return;
      const size = charterViewport(canvas);
      const pivot = { x: size.width / 2, y: size.height / 2 };
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const dx = event.key === 'ArrowRight' ? 40 : event.key === 'ArrowLeft' ? -40 : 0;
        const dy = event.key === 'ArrowDown' ? 40 : event.key === 'ArrowUp' ? -40 : 0;
        applyPan(panBy(charterView, dx, dy));
      } else if (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '0') {
        event.preventDefault();
        if (event.key === '0') applyPan(centreOn(layout.points[CHARTER_ROOT_ID], size, 1));
        else applyPan(zoomAt(charterView, event.key === '-' ? 1 / CHARTER_ZOOM_STEP : CHARTER_ZOOM_STEP, pivot));
      }
    });
  }

  /** Render the Charter graph under a persistent pan/zoom camera. */
  function renderCharter(state: GameState): void {
    const layout = layoutCharter();

    const entries: RowEntry[] = [
      {
        key: 'charter-intro',
        create: () => {
          const intro = document.createElement('p');
          intro.className = 'charter-intro';
          return intro;
        },
        update: (row) => {
          row.textContent = `Spend banked Bog Cores on permanent charter terms. Spent cores stop paying their 5%; the terms survive every draining. Banked: ${formatNumber(state.wallet.bogCores)} 💠`;
        },
      },
      {
        key: 'charter-graph',
        create: () => {
          const canvas = document.createElement('div');
          canvas.className = 'charter-canvas';
          canvas.setAttribute('role', 'group');
          canvas.setAttribute('aria-label', 'Drainage Charter tree. Drag to pan, scroll or pinch to zoom.');
          canvas.tabIndex = 0;
          const sheet = document.createElement('div');
          sheet.className = 'charter-sheet';
          sheet.style.position = 'absolute';
          sheet.style.left = '0';
          sheet.style.top = '0';
          sheet.style.width = `${layout.width}px`;
          sheet.style.height = `${layout.height}px`;
          sheet.style.transformOrigin = '0 0';
          sheet.style.willChange = 'transform';

          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('class', 'charter-edges');
          svg.setAttribute('viewBox', `0 0 ${layout.width} ${layout.height}`);
          svg.setAttribute('aria-hidden', 'true');
          for (const edge of layout.edges) {
            const a = layout.points[edge.from];
            const b = layout.points[edge.to];
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(a.x));
            line.setAttribute('y1', String(a.y));
            line.setAttribute('x2', String(b.x));
            line.setAttribute('y2', String(b.y));
            svg.appendChild(line);
          }
          sheet.appendChild(svg);

          for (const node of CHARTER) {
            const point = layout.points[node.id];
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'charter-node';
            button.dataset.node = node.id;
            button.dataset.branch = node.branch;
            button.style.left = `${point.x}px`;
            button.style.top = `${point.y}px`;
            button.innerHTML = `<span class="charter-node-glyph" aria-hidden="true">${node.emoji}</span><span class="charter-node-name">${node.name}</span>`;
            button.addEventListener('click', () => {
              charterSelected = node.id;
              const latest = currentState;
              if (latest) renderCharter(latest);
            });
            sheet.appendChild(button);
          }
          const toolbar = document.createElement('div');
          toolbar.className = 'charter-zoom';
          toolbar.innerHTML = `
            <button type="button" class="charter-zoom-btn" data-zoom="in" aria-label="Zoom in">+</button>
            <button type="button" class="charter-zoom-btn" data-zoom="out" aria-label="Zoom out">−</button>
            <button type="button" class="charter-zoom-btn" data-zoom="reset" aria-label="Reset view">⌖</button>`;
          canvas.appendChild(sheet);
          canvas.appendChild(toolbar);
          setupCharterCamera(canvas, sheet, toolbar, layout);
          return canvas;
        },
        update: (row) => {
          const buttons = row.querySelectorAll<HTMLButtonElement>('.charter-node');
          for (const button of buttons) {
            const node = CHARTER_BY_ID[button.dataset.node ?? ''];
            if (!node) continue;
            const nodeState = charterNodeState(state, node);
            button.dataset.state = nodeState;
            button.setAttribute('aria-pressed', String(node.id === charterSelected));
            button.setAttribute('aria-label', `${node.name}, ${CHARTER_STATE_LABEL[nodeState]}, ${node.cost} cores`);
            button.title = `${node.name} · ${CHARTER_STATE_LABEL[nodeState]}`;
          }
          const lines = row.querySelectorAll<SVGLineElement>('.charter-edges line');
          layout.edges.forEach((edge, index) => {
            const line = lines[index];
            if (!line) return;
            const child = CHARTER_BY_ID[edge.to];
            line.dataset.state = child ? charterNodeState(state, child) : 'locked';
            line.dataset.cross = edge.crossWing ? 'true' : 'false';
          });
          const sheet = row.querySelector<HTMLElement>('.charter-sheet');
          if (sheet && charterView) {
            sheet.style.transform = toCss(charterView);
          }
        },
      },
      {
        key: 'charter-detail',
        create: () => {
          const detail = document.createElement('div');
          detail.className = 'charter-detail';
          detail.setAttribute('aria-live', 'polite');
          detail.innerHTML = `
            <div class="charter-detail-head">
              <span class="charter-detail-glyph" aria-hidden="true"></span>
              <div>
                <h3 class="charter-detail-name"></h3>
                <p class="charter-detail-branch"></p>
              </div>
            </div>
            <p class="charter-detail-desc"></p>
            <p class="charter-detail-effects"></p>
            <div class="charter-detail-foot">
              <span class="charter-detail-cost"></span>
              <button type="button" class="charter-sign"></button>
            </div>`;
          detail.querySelector<HTMLButtonElement>('.charter-sign')?.addEventListener('click', () => {
            const node = CHARTER_BY_ID[charterSelected];
            if (node) signCharter(node);
          });
          return detail;
        },
        update: (row) => {
          const node = CHARTER_BY_ID[charterSelected] ?? CHARTER[0];
          const nodeState = charterNodeState(state, node);
          row.dataset.state = nodeState;
          row.querySelector('.charter-detail-glyph')!.textContent = node.emoji;
          row.querySelector('.charter-detail-name')!.textContent = node.name;
          row.querySelector('.charter-detail-branch')!.textContent =
            `${CHARTER_BRANCHES[node.branch].name} · ${CHARTER_STATE_LABEL[nodeState]}`;
          row.querySelector('.charter-detail-desc')!.textContent = charterNodeDescription(state, node);
          row.querySelector('.charter-detail-effects')!.textContent = node.effects.map(formatCharterEffect).join(' · ');
          row.querySelector('.charter-detail-cost')!.textContent = `${node.cost} 💠`;
          const sign = row.querySelector<HTMLButtonElement>('.charter-sign')!;
          sign.textContent = nodeState === 'signed' ? 'Signed ✓' : nodeState === 'locked' ? 'Locked' : 'Sign';
          sign.disabled = nodeState !== 'purchasable';
        },
      },
    ];
    reconcileRows(entries);
  }

  function renderSettings(): void {
    const keySignature = 'settings';
    if (
      !forceRebuild &&
      tabContent.dataset.tab === activeTab &&
      tabContent.dataset.keys === keySignature
    ) {
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'settings';
    wrap.innerHTML = `
      <p class="persistence-status">Persistence: ${hooks.persistenceBackend ?? 'IndexedDB (idb) · slot main'}</p>
      <label class="sound-setting"><input type="checkbox" id="set-sound"> Sound effects</label>
      <button class="btn" id="set-save">Save now</button>
      <button class="btn" id="set-export">Export save</button>
      <button class="btn" id="set-import">Import save</button>
      <button class="btn btn-danger" id="set-reset">Hard reset</button>
      <textarea id="save-io" rows="4" aria-label="Save data" placeholder="Exported save appears here; paste a save here to import."></textarea>
    `;
    const soundSetting = wrap.querySelector<HTMLInputElement>('#set-sound')!;
    soundSetting.checked = sound.enabled;
    soundSetting.addEventListener('change', () => {
      sound.setEnabled(soundSetting.checked);
      syncSoundControls();
    });
    wrap.querySelector('#set-save')!.addEventListener('click', () => hooks.onSaveNow());
    const io = wrap.querySelector<HTMLTextAreaElement>('#save-io')!;
    wrap.querySelector('#set-export')!.addEventListener('click', () => {
      io.value = hooks.onExport();
      io.select();
      navigator.clipboard?.writeText(io.value).catch(() => {});
      toast('Save exported — copied to clipboard.');
    });
    wrap.querySelector('#set-import')!.addEventListener('click', () => {
      if (hooks.onImport(io.value)) {
        toast('Save imported.');
      } else {
        toast('Import failed — save data unreadable.');
      }
    });
    wrap.querySelector('#set-reset')!.addEventListener('click', () => hooks.onHardReset());
    tabContent.replaceChildren(wrap);
    renderedRows = new Map();
    tabContent.dataset.tab = activeTab;
    tabContent.dataset.keys = keySignature;
    forceRebuild = false;
  }

  function toast(message: string): void {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    toasts.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }

  function emptyNote(text: string): HTMLElement {
    const p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = text;
    return p;
  }

  function renderLists(state: GameState): void {
    currentState = state;
    switch (activeTab) {
      case 'docket': renderDocket(state); break;
      case 'buildings': renderBuildings(state); break;
      case 'upgrades': renderUpgrades(state); break;
      case 'research': renderResearch(state); break;
      case 'achievements': renderAchievements(state); break;
      case 'charter': renderCharter(state); break;
      case 'settings': renderSettings(); break;
    }
  }

  return {
    renderCounters(state) {
      currentState = state;
      renderCounters(state);
    },
    renderLists,
    renderThermal,
    renderPrestige,
    toast,
    showModal({ title, body, actions }) {
      modal.innerHTML = `<h2>${title}</h2><p>${body}</p><div class="modal-actions"></div>`;
      const row = modal.querySelector('.modal-actions')!;
      for (const a of actions) {
        const btn = document.createElement('button');
        btn.className = `btn${a.danger ? ' btn-danger' : ''}`;
        btn.textContent = a.label;
        btn.addEventListener('click', a.onClick);
        row.appendChild(btn);
      }
      modalBackdrop.hidden = false;
      (row.firstElementChild as HTMLButtonElement | null)?.focus();
    },
    closeModal() {
      modalBackdrop.hidden = true;
    },
    setSavedIndicator(text: string) {
      saveIndicator.textContent = text;
      saveIndicator.classList.remove('flash');
      void saveIndicator.offsetWidth;
      saveIndicator.classList.add('flash');
    },
    spawnFloat,
    renderFieldwork,
  };
}
