import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  BUILDING_BY_ID,
  BUILDINGS,
  DOCKET,
  RESEARCH,
  UPGRADES,
  UPGRADE_BY_ID,
} from '../game/data';
import {
  bulkCost,
  buildingVisible,
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
import { pluralize } from './text';

type TabId = 'docket' | 'buildings' | 'upgrades' | 'research' | 'achievements' | 'settings';
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
      <p class="subtitle">Sector 4 · The Peat Bog Trial — harvest the fp16 compute broth, cool the racks, settle McFly &amp; Chronicler LLP v Burger King Nordic before Magistrate Reino.</p>
    </header>
    <div class="resources" id="resources" aria-live="polite" aria-atomic="true"></div>
    <div class="next-hint" id="next-hint" aria-live="polite"></div>
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
          <button id="harvest-btn" class="harvest-btn" aria-label="Harvest broth (shortcut: H)">
            <span class="harvest-emoji" aria-hidden="true">🫧</span>
            <span class="harvest-label">Harvest broth</span>
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
          <button role="tab" data-tab="docket">Docket</button>
          <button role="tab" data-tab="buildings">Buildings</button>
          <button role="tab" data-tab="upgrades">Upgrades</button>
          <button role="tab" data-tab="research">Research &amp; Litigation</button>
          <button role="tab" data-tab="achievements">Achievements</button>
          <button role="tab" data-tab="settings">Settings</button>
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
      <span>Sector 4 · Peat Bog Trial · McFly &amp; Chronicler LLP v Burger King Nordic</span>
    </footer>
    <div class="toasts" id="toasts" aria-live="assertive"></div>
    <div class="modal-backdrop" id="modal-backdrop" hidden>
      <div class="modal" role="dialog" aria-modal="true" id="modal"></div>
    </div>
  `;

  let activeTab: TabId = hooks.initialTab ?? 'buildings';
  let buyQty: Qty = 1;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;

  const resourcesEl = $('#resources');
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
  const tabContent = $('#tab-content');
  const toasts = $('#toasts');
  const modalBackdrop = $('#modal-backdrop');
  const modal = $('#modal');
  const saveIndicator = $('#save-indicator');
  const qtySelector = $('#qty-selector');
  qtySelector.style.display = activeTab === 'buildings' ? '' : 'none';

  harvestBtn.addEventListener('click', () => hooks.onHarvest());

  const tabButtons = [...root.querySelectorAll<HTMLButtonElement>('.tabs [role="tab"]')];
  const activateTab = (btn: HTMLButtonElement, focus = false): void => {
    activeTab = btn.dataset.tab as TabId;
    tabButtons.forEach((tab) => {
      const selected = tab === btn;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    qtySelector.style.display = activeTab === 'buildings' ? '' : 'none';
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

  let currentState: GameState | null = null;
  let forceRebuild = true;
  let renderedRows = new Map<string, HTMLElement>();

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

  function currentDocket(state: GameState) {
    const id = DOCKET.find((itemId) => !state.achievements.includes(itemId));
    return id ? ACHIEVEMENT_BY_ID[id] : undefined;
  }

  function renderCounters(state: GameState): void {
    const rates = productionPerSecond(state);
    resourcesEl.innerHTML = `
      <span class="res"><span class="res-emoji" aria-hidden="true">🫧</span> <strong>${formatNumber(state.broth)}</strong> fp16 compute broth <em>+${formatNumber(rates.brothPerSecond)}/s</em></span>
      <span class="res"><span class="res-emoji" aria-hidden="true">⚡</span> <strong>${formatNumber(state.compute)}</strong> compute <em>+${formatNumber(rates.computePerSecond)}/s</em></span>
      <span class="res"><span class="res-emoji" aria-hidden="true">💠</span> <strong>${formatNumber(state.bogCores)}</strong> bog cores</span>`;
    const next = currentDocket(state);
    nextHint.textContent = next ? `Next up: ${next.name}` : 'Docket complete — the peat bog trial is settled.';
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
      ? `Petition Magistrate Reino to drain the bog. Draining banks ${gain} Bog Core${gain === 1 ? '' : 's'} (+${gain * 5}% all production, permanent). Run resets; achievements and cores stay.`
      : `Petition Magistrate Reino to drain the bog. Available at ${formatNumber(1_000_000)} compute this run (${formatNumber(state.totalComputeThisRun)} so far).`;
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
        <span class="item-name">${parts.name}<span class="owned"></span></span>
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
    const action = row.querySelector<HTMLElement>('.item-action, .docket-badge');
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

  function renderBuildings(state: GameState): void {
    const entries: RowEntry[] = [];
    const categories = ['broth', 'cooling', 'compute'] as const;
    for (const category of categories) {
      const categoryBuildings = BUILDINGS.filter((def) => def.category === category);
      const visible = categoryBuildings.filter((def) => buildingVisible(state, def));
      const nextLocked = categoryBuildings.find((def) => !buildingVisible(state, def));
      if (visible.length > 0 || nextLocked) {
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
        const threshold = nextLocked.unlock?.brothPerSecond !== undefined
          ? `${formatNumber(nextLocked.unlock.brothPerSecond)} broth/s`
          : `${formatNumber(nextLocked.unlock?.computePerSecond ?? 0)} compute/s`;
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

  function renderDocket(state: GameState): void {
    const currentId = DOCKET.find((id) => !state.achievements.includes(id));
    const entries: RowEntry[] = DOCKET.map((id) => {
      const achievement = ACHIEVEMENT_BY_ID[id];
      return {
        key: id,
        create: () =>
          createRow(id, {
            emoji: achievement.emoji,
            name: achievement.name,
            desc: achievement.description,
            className: 'docket-row',
            trailingClass: 'docket-badge',
          }),
        update: (row) => {
          const done = state.achievements.includes(id);
          const status = done ? 'done' : id === currentId ? 'current' : 'upcoming';
          updateRow(row, {
            status,
            badge: done ? 'Filed ✓' : status === 'current' ? 'In progress' : 'Pending',
          });
        },
      };
    });
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
    if (upgrade.cost.broth !== undefined) {
      thresholds.push(`${formatNumber(upgrade.cost.broth * 0.1)} broth`);
    }
    if (upgrade.cost.compute !== undefined) {
      thresholds.push(`${formatNumber(upgrade.cost.compute * 0.1)} compute`);
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
    const entries: RowEntry[] = [];
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
    const entries: RowEntry[] = RESEARCH.map((r) => ({
      key: r.id,
      create: () =>
        createRow(r.id, {
          emoji: r.emoji,
          name: r.name,
          desc: r.description,
          onClick: () => {
            const latest = currentState;
            if (latest && buyResearch(latest, r.id)) renderLists(latest);
          },
        }),
      update: (row) => {
        const latest = currentState ?? state;
        const owned = latest.research.includes(r.id);
        updateRow(row, {
          cost: formatCost(r.cost),
          owned: owned ? '✓ done' : '',
          action: owned ? '' : 'Research',
          disabled: owned || !canAfford(latest, r.cost),
          label: owned ? `${r.name} (researched)` : `Research ${r.name} for ${formatCost(r.cost)}`,
        });
      },
    }));
    reconcileRows(entries);
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
