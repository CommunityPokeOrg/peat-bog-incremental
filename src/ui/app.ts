import {
  ACHIEVEMENTS,
  BUILDING_BY_ID,
  BUILDINGS,
  RESEARCH,
  UPGRADES,
  type ResourceCost,
} from '../game/data';
import {
  bulkCost,
  buyBuilding,
  buyResearch,
  buyUpgrade,
  canAfford,
  canPrestige,
  clickPower,
  maxAffordable,
  prestigeGain,
  productionPerSecond,
  thermalFactor,
  totalCooling,
  totalHeat,
  upgradeVisible,
} from '../game/engine';
import { formatCost, formatNumber } from '../game/format';
import type { GameState } from '../game/state';

type TabId = 'buildings' | 'upgrades' | 'research' | 'achievements' | 'settings';
type Qty = number | 'max';

export interface UiHooks {
  onHarvest(): void;
  onPrestige(): void;
  onSaveNow(): void;
  onExport(): string;
  onImport(encoded: string): boolean;
  onHardReset(): void;
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
  spawnFloat(amount: number): void;
  showModal(opts: { title: string; body: string; actions: { label: string; danger?: boolean; onClick(): void }[] }): void;
  closeModal(): void;
  setSavedIndicator(text: string): void;
}

export function createUi(root: HTMLElement, hooks: UiHooks): Ui {
  root.innerHTML = `
    <header class="site-header">
      <h1>Peat Bog Incremental</h1>
      <p class="subtitle">Harvest the broth. Cool the racks. Drain the bog.</p>
    </header>
    <div class="resources" id="resources" aria-live="polite" aria-atomic="true"></div>
    <main class="layout">
      <section class="harvest-panel" aria-label="Harvest">
        <div class="card thermal-card">
          <div class="thermal-labels">
            <span id="thermal-text">No heat generated</span>
            <span id="thermal-pct"></span>
          </div>
          <div class="thermal-bar" role="meter" aria-label="Cooling versus heat" id="thermal-meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
            <div class="thermal-fill" id="thermal-fill"></div>
          </div>
          <div class="thermal-sub" id="thermal-sub"></div>
        </div>
        <div class="harvest-zone" id="harvest-zone">
          <button id="harvest-btn" class="harvest-btn" aria-label="Harvest Broth (shortcut: H)">
            <span class="harvest-emoji" aria-hidden="true">🫧</span>
            <span class="harvest-label">Harvest Broth</span>
          </button>
          <div class="float-layer" id="float-layer" aria-hidden="true"></div>
        </div>
        <p class="click-power">Click power: <strong id="click-power">1</strong> broth <kbd>H</kbd></p>
        <div class="card prestige-card" id="prestige-card">
          <h2>Drain the Bog</h2>
          <p id="prestige-info"></p>
          <button id="prestige-btn" class="btn btn-prestige"></button>
        </div>
      </section>
      <section class="panel">
        <nav class="tabs" role="tablist" aria-label="Game panels">
          <button role="tab" data-tab="buildings" aria-selected="true">Buildings</button>
          <button role="tab" data-tab="upgrades" aria-selected="false">Upgrades</button>
          <button role="tab" data-tab="research" aria-selected="false">Research</button>
          <button role="tab" data-tab="achievements" aria-selected="false">Achievements</button>
          <button role="tab" data-tab="settings" aria-selected="false">Settings</button>
        </nav>
        <div class="qty-selector" id="qty-selector" role="group" aria-label="Buy quantity">
          <span>Buy:</span>
          <button data-qty="1" aria-pressed="true">1</button>
          <button data-qty="10" aria-pressed="false">10</button>
          <button data-qty="100" aria-pressed="false">100</button>
          <button data-qty="max" aria-pressed="false">Max</button>
        </div>
        <div class="tab-content" id="tab-content" role="tabpanel"></div>
      </section>
    </main>
    <footer class="site-footer">
      <span id="save-indicator" aria-live="polite"></span>
      <span>v1.0.0 · Peat Bog Incremental</span>
    </footer>
    <div class="toasts" id="toasts" aria-live="assertive"></div>
    <div class="modal-backdrop" id="modal-backdrop" hidden>
      <div class="modal" role="dialog" aria-modal="true" id="modal"></div>
    </div>
  `;

  let activeTab: TabId = 'buildings';
  let buyQty: Qty = 1;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;

  const resourcesEl = $('#resources');
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
  const tabContent = $('#tab-content');
  const toasts = $('#toasts');
  const modalBackdrop = $('#modal-backdrop');
  const modal = $('#modal');
  const saveIndicator = $('#save-indicator');

  harvestBtn.addEventListener('click', () => hooks.onHarvest());

  root.querySelectorAll<HTMLButtonElement>('.tabs [role="tab"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab as TabId;
      root.querySelectorAll('.tabs [role="tab"]').forEach((b) =>
        b.setAttribute('aria-selected', String(b === btn)),
      );
      $('#qty-selector').style.display = activeTab === 'buildings' ? '' : 'none';
      if (currentState) renderLists(currentState);
    });
  });

  root.querySelectorAll<HTMLButtonElement>('#qty-selector [data-qty]').forEach((btn) => {
    btn.addEventListener('click', () => {
      buyQty = btn.dataset.qty === 'max' ? 'max' : Number(btn.dataset.qty);
      root.querySelectorAll('#qty-selector [data-qty]').forEach((b) =>
        b.setAttribute('aria-pressed', String(b === btn)),
      );
      if (currentState) renderLists(currentState);
    });
  });

  prestigeBtn.addEventListener('click', () => hooks.onPrestige());

  let currentState: GameState | null = null;

  function spawnFloat(amount: number): void {
    const el = document.createElement('span');
    el.className = 'float-num';
    el.textContent = `+${formatNumber(amount)}`;
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

  function renderCounters(state: GameState): void {
    const rates = productionPerSecond(state);
    resourcesEl.innerHTML = `
      <span class="res"><span class="res-emoji" aria-hidden="true">🫧</span> <strong>${formatNumber(state.broth)}</strong> broth <em>+${formatNumber(rates.brothPerSecond)}/s</em></span>
      <span class="res"><span class="res-emoji" aria-hidden="true">⚡</span> <strong>${formatNumber(state.compute)}</strong> compute <em>+${formatNumber(rates.computePerSecond)}/s</em></span>
      <span class="res"><span class="res-emoji" aria-hidden="true">💠</span> <strong>${formatNumber(state.bogCores)}</strong> bog cores</span>`;
    clickPowerEl.textContent = formatNumber(clickPower(state));
    renderThermal(state);
    renderPrestige(state);
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
    thermalFill.classList.toggle('throttled', factor < 1);
    thermalMeter.setAttribute('aria-valuenow', String(pct));
  }

  function renderPrestige(state: GameState): void {
    const gain = prestigeGain(state);
    const ok = canPrestige(state);
    prestigeInfo.textContent = ok
      ? `Draining banks ${gain} Bog Core${gain === 1 ? '' : 's'} (+${gain * 5}% all production, permanent). Run resets; achievements and cores stay.`
      : `Available at ${formatNumber(1_000_000)} compute this run (${formatNumber(state.totalComputeThisRun)} so far).`;
    prestigeBtn.disabled = !ok;
    prestigeBtn.textContent = ok ? `Drain for ${gain} 💠` : 'Drain the Bog';
    prestigeBtn.setAttribute(
      'aria-label',
      ok ? `Drain the Bog and gain ${gain} Bog Cores` : 'Drain the Bog (locked)',
    );
  }

  function itemRow(opts: {
    emoji: string;
    name: string;
    desc: string;
    cost: ResourceCost;
    owned?: string;
    action?: string;
    disabled: boolean;
    label: string;
    onBuy(): void;
  }): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'item';
    btn.disabled = opts.disabled;
    btn.setAttribute('aria-label', opts.label);
    btn.innerHTML = `
      <span class="item-emoji" aria-hidden="true">${opts.emoji}</span>
      <span class="item-body">
        <span class="item-name">${opts.name}${opts.owned ? ` <span class="owned">${opts.owned}</span>` : ''}</span>
        <span class="item-desc">${opts.desc}</span>
        <span class="item-cost">${formatCost(opts.cost)}</span>
      </span>
      ${opts.action ? `<span class="item-action" aria-hidden="true">${opts.action}</span>` : ''}`;
    btn.addEventListener('click', opts.onBuy);
    return btn;
  }

  function renderBuildings(state: GameState): void {
    const frag = document.createDocumentFragment();
    for (const def of BUILDINGS) {
      const owned = state.buildings[def.id] ?? 0;
      const qty = effectiveQty(state, def.id);
      const cost = bulkCost(def, owned, qty);
      const perUnit: string[] = [];
      if (def.brothPerSecond) perUnit.push(`+${formatNumber(def.brothPerSecond)} broth/s`);
      if (def.computePerSecond) perUnit.push(`+${formatNumber(def.computePerSecond)} compute/s`);
      if (def.cooling) perUnit.push(`+${formatNumber(def.cooling)} cooling`);
      if (def.heat) perUnit.push(`${formatNumber(def.heat)} heat`);
      frag.appendChild(
        itemRow({
          emoji: def.emoji,
          name: def.name,
          desc: `${def.description} ${perUnit.join(', ')}.`,
          cost,
          owned: `×${owned}`,
          action: `Buy ×${qty}`,
          disabled: !canAfford(state, cost),
          label: `Buy ${qty} ${def.name} for ${formatCost(cost)}`,
          onBuy: () => {
            if (buyBuilding(state, def.id, qty)) renderLists(state);
          },
        }),
      );
    }
    tabContent.replaceChildren(frag);
  }

  function renderUpgrades(state: GameState): void {
    const frag = document.createDocumentFragment();
    const visible = UPGRADES.filter((u) => upgradeVisible(state, u));
    for (const u of visible) {
      const owned = state.upgrades.includes(u.id);
      frag.appendChild(
        itemRow({
          emoji: u.emoji,
          name: u.name,
          desc: u.description,
          cost: u.cost,
          owned: owned ? '✓ owned' : undefined,
          action: owned ? undefined : 'Buy',
          disabled: owned || !canAfford(state, u.cost),
          label: owned ? `${u.name} (owned)` : `Buy upgrade ${u.name} for ${formatCost(u.cost)}`,
          onBuy: () => {
            if (buyUpgrade(state, u.id)) renderLists(state);
          },
        }),
      );
    }
    if (visible.length === 0) {
      frag.appendChild(emptyNote('No upgrades available yet — keep building.'));
    }
    tabContent.replaceChildren(frag);
  }

  function renderResearch(state: GameState): void {
    const frag = document.createDocumentFragment();
    for (const r of RESEARCH) {
      const owned = state.research.includes(r.id);
      frag.appendChild(
        itemRow({
          emoji: r.emoji,
          name: r.name,
          desc: r.description,
          cost: r.cost,
          owned: owned ? '✓ done' : undefined,
          action: owned ? undefined : 'Research',
          disabled: owned || !canAfford(state, r.cost),
          label: owned ? `${r.name} (researched)` : `Research ${r.name} for ${formatCost(r.cost)}`,
          onBuy: () => {
            if (buyResearch(state, r.id)) renderLists(state);
          },
        }),
      );
    }
    tabContent.replaceChildren(frag);
  }

  function renderAchievements(state: GameState): void {
    const frag = document.createDocumentFragment();
    for (const a of ACHIEVEMENTS) {
      const done = state.achievements.includes(a.id);
      const div = document.createElement('div');
      div.className = `item achievement ${done ? 'unlocked' : 'locked'}`;
      div.innerHTML = `
        <span class="item-emoji" aria-hidden="true">${done ? a.emoji : '🔒'}</span>
        <span class="item-body">
          <span class="item-name">${a.name}</span>
          <span class="item-desc">${a.description} <em>+1% all production</em></span>
        </span>`;
      frag.appendChild(div);
    }
    tabContent.replaceChildren(frag);
  }

  function renderSettings(): void {
    const wrap = document.createElement('div');
    wrap.className = 'settings';
    wrap.innerHTML = `
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
      case 'buildings': renderBuildings(state); break;
      case 'upgrades': renderUpgrades(state); break;
      case 'research': renderResearch(state); break;
      case 'achievements': renderAchievements(state); break;
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
  };
}
