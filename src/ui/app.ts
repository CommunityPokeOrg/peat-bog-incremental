import {
  ACHIEVEMENTS,
  BUILDING_BY_ID,
  BUILDINGS,
  RESOURCES,
  RESEARCH,
  FIELD_NOTES,
  UPGRADES,
  UPGRADE_BY_ID,
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
  MAX_RESEARCH_QUEUE,
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
import type { GameState } from '../game/state';
import { QUESTS, claimQuest, questProgress, questReady, type QuestReward } from '../game/quests';
import { CHARTER, CHARTER_BRANCHES, CHARTER_BY_ID, buyCharter, charterAvailable, type CharterNodeDef } from '../game/charter';
import { formatMultiplier, formatQuestReward, pluralize } from './text';
import {
  calibrationNeedle,
  calibrationZone,
  needleAtClick,
  peatCutCharge,
  streakMultiplier,
  type CalibrationResult,
  type NeedleFrame,
} from '../game/minigames';

type TabId = 'docket' | 'buildings' | 'upgrades' | 'research' | 'achievements' | 'charter' | 'settings';
type Qty = number | 'max';

export interface UiHooks {
  initialTab?: TabId;
  persistenceBackend?: string;
  onHarvest(): void;
  onPrestige(): void;
  onSaveNow(): void;
  onExport(): string;
  onImport(encoded: string): boolean;
  onHardReset(): void;
  onCutPeat?(charge: number): number | void;
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
  spawnFloat(amount: number, resource?: string): void;
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
      <section class="panel">
        <nav class="tabs" role="tablist" aria-label="Game panels">
          <button role="tab" data-tab="docket">Docket</button>
          <button role="tab" data-tab="buildings">Production</button>
          <button role="tab" data-tab="upgrades">Upgrades</button>
          <button role="tab" data-tab="research">Research</button>
          <button role="tab" data-tab="achievements">Achievements</button>
          <button role="tab" data-tab="charter">Charter</button>
          <button role="tab" data-tab="settings">Settings</button>
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
  let productionFilter: 'all' | 'broth' | 'peat' | 'sphagnum' | 'methane' | 'cooling' | 'compute' | 'evidence' = 'all';

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;

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

  harvestBtn.addEventListener('click', () => hooks.onHarvest());

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

  prestigeBtn.addEventListener('click', () => hooks.onPrestige());

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

  function resourceAmount(state: GameState, id: string): number {
    if (id === 'bogCores') return state.bogCores;
    return state[id as 'broth' | 'peat' | 'sphagnum' | 'methane' | 'compute' | 'evidence'];
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

  function spawnFloat(amount: number, resource = 'broth'): void {
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
    const quest = QUESTS.find((item) => !state.quests.claimed.includes(item.id));
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
      const lifetimeEarned = resource.id === 'peat'
        ? state.totalPeatEarned
        : resource.id === 'sphagnum'
          ? state.totalSphagnumEarned
          : resource.id === 'methane'
            ? state.totalMethaneEarned
            : resource.id === 'evidence'
              ? state.totalEvidenceEarned
              : amount;
      const shouldShow = resource.id === 'broth' || resource.id === 'compute' || resource.id === 'bogCores' ||
        lifetimeEarned > 0 || BUILDINGS.some((def) =>
          (def.generates === resource.id || (resource.id === 'compute' && def.generates === 'compute')) &&
          buildingVisible(state, def) && (state.buildings[def.id] ?? 0) > 0,
        );
      chip.hidden = !shouldShow;
    }
    const note = FIELD_NOTES[Math.floor(Date.now() / 20_000) % FIELD_NOTES.length];
    if (note !== renderedFieldNote) {
      fieldNote.textContent = note;
      renderedFieldNote = note;
    }
    const boil = Math.max(1.2, Math.min(6, 6 / Math.log10(rates.broth + 10)));
    harvestBtn.style.setProperty('--boil', `${boil}s`);
    renderBuffs(state);
    const next = currentDocket(state);
    const nextCurrent = next ? Math.min(next.progress.current, next.progress.target) : 0;
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
    const pct = Math.round(factor * 100);
    if (heat <= 0) {
      thermalText.textContent = 'No heat generated';
      thermalPct.textContent = '';
      thermalSub.textContent = 'Buy Server Racks to generate compute.';
    } else {
      thermalText.textContent = `Heat ${formatNumber(heat)} / Cooling ${formatNumber(cooling)}`;
      thermalPct.textContent = `${pct}% cooled`;
      thermalSub.textContent =
        factor >= 1
          ? 'Racks running at full speed.'
          : 'Racks throttled — build more cooling!';
    }
    thermalFill.style.width = `${pct}%`;
    thermalFill.style.setProperty('--cooled', `${pct}%`);
    thermalFill.classList.toggle('throttled', factor < 1);
    thermalMeter.setAttribute('aria-valuenow', String(pct));
  }

  function renderPrestige(state: GameState): void {
    const gain = prestigeGain(state);
    const ok = canPrestige(state);
    const charterHint = state.bogCores > 0 ? ' Banked cores can be spent in the Charter tab.' : '';
    prestigeInfo.textContent = ok
      ? `Petition Magistrate Reino to drain the bog. Draining banks ${gain} Bog Core${gain === 1 ? '' : 's'} (+${gain * 5}% all production, permanent). Run resets; achievements and cores stay.${charterHint}`
      : `Petition Magistrate Reino to drain the bog. Available at ${formatNumber(1_000_000)} compute this run (${formatNumber(state.totalComputeThisRun)} so far).${charterHint}`;
    prestigeBtn.disabled = !ok;
    prestigeBtn.textContent = ok ? `Drain for ${gain} 💠` : 'Drain the bog';
    prestigeBtn.setAttribute(
      'aria-label',
      ok ? `Drain the bog and gain ${gain} Bog Cores` : 'Drain the bog (locked)',
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
    if (parts.onClick) row.addEventListener('click', parts.onClick);
    return row;
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

  const productionCategories = ['broth', 'peat', 'sphagnum', 'methane', 'cooling', 'compute', 'evidence'] as const;
  function renderProductionFilters(state: GameState): void {
    if (!productionFilters.firstElementChild) {
      const wrap = document.createElement('div');
      wrap.className = 'filter-tabs';
      wrap.setAttribute('role', 'tablist');
      wrap.setAttribute('aria-label', 'Filter by output');
      const pill = document.createElement('span');
      pill.className = 'filter-pill';
      pill.setAttribute('aria-hidden', 'true');
      wrap.appendChild(pill);
      for (const filter of ['all', ...productionCategories] as const) {
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
        BUILDINGS.some((def) => def.generates === category && buildingVisible(state, def)),
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
    renderProductionFilters(state);
    const entries: RowEntry[] = [];
    const categories = productionCategories;
    for (const category of categories) {
      if (productionFilter !== 'all' && productionFilter !== category) continue;
      const categoryBuildings = BUILDINGS.filter((def) => def.generates === category);
      const visible = categoryBuildings.filter((def) => buildingVisible(state, def));
      const nextLocked = categoryBuildings.find((def) => !buildingVisible(state, def));
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
          if (def.brothPerSecond) perUnit.push(`+${formatNumber(def.brothPerSecond)} broth/s`);
          if (def.computePerSecond) perUnit.push(`+${formatNumber(def.computePerSecond)} compute/s`);
          if (def.peatPerSecond) perUnit.push(`+${formatNumber(def.peatPerSecond)} peat/s`);
          if (def.sphagnumPerSecond) perUnit.push(`+${formatNumber(def.sphagnumPerSecond)} sphagnum/s`);
          if (def.methanePerSecond) perUnit.push(`+${formatNumber(def.methanePerSecond)} methane/s`);
          if (def.evidencePerSecond) perUnit.push(`+${formatNumber(def.evidencePerSecond)} evidence/s`);
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
                if (buyBuilding(latest, def.id, qty)) renderLists(latest);
              },
            }),
          update: (row) => {
            const latest = currentState ?? state;
            const owned = latest.buildings[def.id] ?? 0;
            const qty = effectiveQty(latest, def.id);
            const cost = bulkCost(def, owned, qty);
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
        const threshold = Object.entries(nextLocked.unlock ?? {})
          .map(([resource, amount]) => `${formatNumber(amount)} ${resource.replace('PerSecond', '')}/s`)
          .join(' and ');
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
    const chapters = ['discovery', 'litigation', 'verdict', 'keepers'] as const;
    const chapterLabels: Record<(typeof chapters)[number], string> = {
      discovery: 'Discovery',
      litigation: 'Litigation',
      verdict: 'Verdict',
      keepers: 'Keepers of the Bog',
    };
    const entries: RowEntry[] = [];
    for (const chapter of chapters) {
      const quests = QUESTS.filter((quest) => quest.chapter === chapter);
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
            const current = Math.min(progress.current, progress.target);
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
              button.className = 'btn quest-claim';
              button.textContent = 'Claim';
              button.setAttribute('aria-label', `Claim ${quest.name}`);
              button.addEventListener('click', () => {
                const latest = currentState;
                if (!latest) return;
                const reward = hooks.onClaimQuest?.(quest.id) ??
                  claimQuest(latest, quest.id);
                if (!reward) return;
                toast(`Filed: ${quest.name} — ${formatQuestReward(reward)}`);
                renderCounters(latest);
                renderLists(latest);
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
                if (latest && buyUpgrade(latest, upgrade.id)) renderLists(latest);
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
          if (bought) renderLists(latest);
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
      create: () => createSectionHeading(`In progress · ${queued.length} / ${MAX_RESEARCH_QUEUE} slots`),
      update: (row) => {
        row.textContent = `In progress · ${state.researchQueue.length} / ${MAX_RESEARCH_QUEUE} slots`;
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
    const available = RESEARCH.filter((research) =>
      !state.research.includes(research.id) &&
      !state.researchQueue.some((entry) => entry.id === research.id),
    );
    if (available.length > 0) {
      entries.push({
        key: 'research-available-heading',
        create: () => createSectionHeading('Available'),
        update: () => {},
      });
    }
    for (const research of available) {
      entries.push({
        key: research.id,
        create: () => createRow(research.id, {
          emoji: research.emoji,
          name: research.name,
          desc: research.description,
          onClick: () => {
            const latest = currentState;
            if (latest && hooks.onQueueResearch?.(research.id) !== false) {
              if (!hooks.onQueueResearch) buyResearch(latest, research.id);
              renderLists(latest);
            }
          },
        }),
        update: (row) => {
          const full = state.researchQueue.length >= MAX_RESEARCH_QUEUE;
          const affordable = canAfford(state, research.cost);
          updateRow(row, {
            cost: `${formatCost(research.cost)} · ⏱ ${formatDuration(research.durationSec)}`,
            action: full ? 'Queue full' : 'Queue',
            disabled: full || !affordable,
            label: `Queue ${research.name}`,
          });
        },
      });
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
      <span class="research-meta"><span class="research-remaining"></span><button class="btn research-cancel">Cancel</button></span>`;
    return row;
  }

  function updateResearchRow(
    row: HTMLElement,
    research: (typeof RESEARCH)[number],
    state: GameState,
    queued: boolean,
  ): void {
    row.querySelector<HTMLElement>('.item-emoji')!.textContent = research.emoji;
    row.querySelector<HTMLElement>('.item-name-label')!.textContent = research.name;
    row.querySelector<HTMLElement>('.item-desc')!.textContent = research.description;
    const bar = row.querySelector<HTMLElement>('.progress')!;
    const progress = researchProgress(state, research.id);
    const fraction = progress?.fraction ?? 0;
    bar.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
    bar.setAttribute('aria-label', `${research.name} progress`);
    bar.querySelector<HTMLElement>('.progress-fill')!.style.width = `${fraction * 100}%`;
    const remaining = row.querySelector<HTMLElement>('.research-remaining')!;
    remaining.textContent = progress ? formatDuration(progress.remaining) : '';
    row.querySelector<HTMLButtonElement>('.research-cancel')!.hidden = !queued;
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
    return node.description;
  }

  function renderCharter(state: GameState): void {
    const entries: RowEntry[] = [];
    for (const branch of Object.keys(CHARTER_BRANCHES) as (keyof typeof CHARTER_BRANCHES)[]) {
      const nodes = CHARTER.filter((node) => node.branch === branch);
      const signed = nodes.filter((node) => state.charter.includes(node.id)).length;
      entries.push({
        key: `charter-heading-${branch}`,
        create: () => createSectionHeading(`${CHARTER_BRANCHES[branch].name} · ${signed}/${nodes.length}`),
        update: (row) => {
          row.textContent = `${CHARTER_BRANCHES[branch].name} · ${signed}/${nodes.length}`;
          row.title = CHARTER_BRANCHES[branch].blurb;
        },
      });
      for (const node of nodes) {
        entries.push({
          key: `charter-${node.id}`,
          create: () => createRow(`charter-${node.id}`, {
            emoji: node.emoji,
            name: node.name,
            desc: charterNodeDescription(state, node),
            onClick: () => {
              const latest = currentState;
              if (!latest || latest.charter.includes(node.id) || !charterAvailable(latest, node)) return;
              const bought = hooks.onBuyCharter
                ? hooks.onBuyCharter(node.id)
                : buyCharter(latest, node.id);
              if (bought) {
                toast(`Charter signed: ${node.name}`);
                renderCounters(latest);
                renderLists(latest);
              }
            },
          }),
          update: (row) => {
            const owned = state.charter.includes(node.id);
            const available = charterAvailable(state, node);
            const locked = Boolean(node.requires && !state.charter.includes(node.requires));
            updateRow(row, {
              cost: `${node.cost} 💠`,
              action: owned ? 'Signed ✓' : locked ? '' : 'Sign',
              disabled: owned || locked || !available,
              label: owned ? `${node.name} (signed)` : `Sign ${node.name}`,
              desc: charterNodeDescription(state, node),
              status: owned ? 'unlocked' : locked ? 'locked' : 'unlocked',
            });
          },
        });
      }
    }
    entries.unshift({
      key: 'charter-intro',
      create: () => {
        const intro = document.createElement('p');
        intro.className = 'charter-intro';
        return intro;
      },
      update: (row) => {
        row.textContent = `Spend banked Bog Cores on permanent charter terms. Spent cores stop paying their 5%; the terms survive every draining. Banked: ${state.bogCores} 💠`;
      },
    });
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
      <button class="btn" id="set-save">Save now</button>
      <button class="btn" id="set-export">Export save</button>
      <button class="btn" id="set-import">Import save</button>
      <button class="btn btn-danger" id="set-reset">Hard reset</button>
      <textarea id="save-io" rows="4" aria-label="Save data" placeholder="Exported save appears here; paste a save here to import."></textarea>
    `;
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
