// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { BUILDING_BY_ID } from '../src/game/data';
import { buildingVisible } from '../src/game/engine';
import { createInitialState } from '../src/game/state';
import { createUi } from '../src/ui/app';
import { pluralize } from '../src/ui/text';

describe('UI list reconciliation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('preserves rows for affordability updates and rebuilds for quantity changes', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const ui = createUi(root, {
      onHarvest: () => {},
      onPrestige: () => {},
      onSaveNow: () => {},
      onExport: () => '',
      onImport: () => false,
      onHardReset: () => {},
    });
    const state = createInitialState();

    ui.renderLists(state);
    const firstRow = root.querySelector<HTMLButtonElement>('[data-key="harvester"]');
    expect(firstRow).not.toBeNull();
    expect(firstRow!.disabled).toBe(true);

    state.broth = 15;
    ui.renderLists(state);
    const updatedRow = root.querySelector<HTMLButtonElement>('[data-key="harvester"]');
    expect(updatedRow).toBe(firstRow);
    expect(updatedRow!.disabled).toBe(false);

    root.querySelector<HTMLButtonElement>('[data-qty="max"]')!.click();
    const maxRow = root.querySelector<HTMLButtonElement>('[data-key="harvester"]');
    expect(maxRow).not.toBe(firstRow);
  });

  it('does not replace the Settings textarea on repeated renders', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const ui = createUi(root, {
      onHarvest: () => {},
      onPrestige: () => {},
      onSaveNow: () => {},
      onExport: () => '',
      onImport: () => false,
      onHardReset: () => {},
    });
    const state = createInitialState();

    ui.renderLists(state);
    root.querySelector<HTMLButtonElement>('[data-tab="settings"]')!.click();
    const textarea = root.querySelector<HTMLTextAreaElement>('#save-io')!;
    textarea.value = 'typed save data';
    ui.renderLists(state);
    expect(root.querySelector<HTMLTextAreaElement>('#save-io')).toBe(textarea);
    expect(textarea.value).toBe('typed save data');
  });

  it('shows locked building teasers and reveals the next blueprint', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const ui = createUi(root, {
      onHarvest: () => {},
      onPrestige: () => {},
      onSaveNow: () => {},
      onExport: () => '',
      onImport: () => false,
      onHardReset: () => {},
    });
    const state = createInitialState();

    ui.renderLists(state);
    const teaser = root.querySelector('[data-key="locked-dredger"]');
    expect(teaser).not.toBeNull();
    expect(teaser).not.toBeInstanceOf(HTMLButtonElement);

    state.revealed.push('dredger');
    ui.renderLists(state);
    expect(root.querySelector<HTMLButtonElement>('[data-key="dredger"]')).not.toBeNull();
  });

  it('keeps large owned counts inside the item name structure', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const ui = createUi(root, {
      onHarvest: () => {},
      onPrestige: () => {},
      onSaveNow: () => {},
      onExport: () => '',
      onImport: () => false,
      onHardReset: () => {},
    });
    const state = createInitialState();
    state.buildings.harvester = 12_345;
    ui.renderLists(state);

    const row = root.querySelector('[data-key="harvester"]')!;
    const name = row.querySelector('.item-name')!;
    const owned = row.querySelector('.owned')!;
    expect(owned.textContent).toBe('×12345');
    expect(name.textContent).toContain('Peat Harvester');
    expect(name.contains(owned)).toBe(true);
  });

  it('moves purchased upgrades into an owned drawer and preserves its open state', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const ui = createUi(root, {
      onHarvest: () => {},
      onPrestige: () => {},
      onSaveNow: () => {},
      onExport: () => '',
      onImport: () => false,
      onHardReset: () => {},
    });
    const state = createInitialState();
    state.broth = 100;
    state.totalBrothEarned = 100;
    ui.renderLists(state);
    root.querySelector<HTMLButtonElement>('[data-tab="upgrades"]')!.click();
    const spade = root.querySelector<HTMLButtonElement>('[data-key="spade"]');
    expect(spade).not.toBeNull();
    spade!.click();

    expect(root.querySelector('[data-key="spade"]')).toBeNull();
    expect(root.querySelector('[data-upgrade-id="spade"]')).not.toBeNull();
    const drawer = root.querySelector<HTMLDetailsElement>('.owned-drawer')!;
    drawer.open = true;
    ui.renderLists(state);
    expect(drawer.open).toBe(true);
  });

  it('moves through tabs with arrow keys and keeps one tab tabbable', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const ui = createUi(root, {
      onHarvest: () => {},
      onPrestige: () => {},
      onSaveNow: () => {},
      onExport: () => '',
      onImport: () => false,
      onHardReset: () => {},
    });
    ui.renderLists(createInitialState());
    const buildings = root.querySelector<HTMLButtonElement>('[data-tab="buildings"]')!;
    const upgrades = root.querySelector<HTMLButtonElement>('[data-tab="upgrades"]')!;
    buildings.focus();
    buildings.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(document.activeElement).toBe(upgrades);
    expect(upgrades.getAttribute('aria-selected')).toBe('true');
    expect(upgrades.tabIndex).toBe(0);
    expect(buildings.tabIndex).toBe(-1);
  });

  it('pluralizes common building names', () => {
    expect(pluralize(10, 'Refinery')).toBe('Refineries');
    expect(pluralize(3, 'Vat')).toBe('Vats');
    expect(pluralize(2, 'Chiller')).toBe('Chillers');
  });

  it('hides upcoming overclocks for unrevealed buildings', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const ui = createUi(root, {
      onHarvest: () => {},
      onPrestige: () => {},
      onSaveNow: () => {},
      onExport: () => '',
      onImport: () => false,
      onHardReset: () => {},
    });
    const state = createInitialState();
    ui.renderLists(state);
    root.querySelector<HTMLButtonElement>('[data-tab="upgrades"]')!.click();

    expect(buildingVisible(state, BUILDING_BY_ID.dredger)).toBe(false);
    expect(root.querySelector('[data-key="soon-boost-dredger"]')).toBeNull();
    expect(root.querySelector('[data-key="soon-boost-refinery"]')).toBeNull();
    expect(root.querySelector('[data-key="soon-boost-still"]')).toBeNull();
  });
});
