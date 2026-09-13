// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { RESEARCH } from '../src/game/data';
import { createInitialState } from '../src/game/state';
import { createUi } from '../src/ui/app';

function makeUi(root: HTMLElement, overrides: Partial<Parameters<typeof createUi>[1]> = {}) {
  return createUi(root, {
    onHarvest: () => {},
    onPrestige: () => {},
    onSaveNow: () => {},
    onExport: () => '',
    onImport: () => false,
    onHardReset: () => {},
    ...overrides,
  });
}

describe('UI overhaul', () => {
  it('filters Production rows and restores category headings', () => {
    const root = document.createElement('div');
    const ui = makeUi(root);
    const state = createInitialState();

    ui.renderLists(state);
    root.querySelector<HTMLButtonElement>('[data-filter="cooling"]')!.click();
    expect(root.querySelector('[data-key="chiller"]')).not.toBeNull();
    expect(root.querySelector('[data-key="harvester"]')).toBeNull();

    root.querySelector<HTMLButtonElement>('[data-filter="all"]')!.click();
    expect(root.querySelector('[data-key="heading-broth"]')).not.toBeNull();
    expect(root.querySelector('[data-key="heading-cooling"]')).not.toBeNull();
  });

  it('keeps the buy dock last and only visible on Production', () => {
    const root = document.createElement('div');
    const ui = makeUi(root);
    const state = createInitialState();

    ui.renderLists(state);
    const panel = root.querySelector('.panel')!;
    expect(panel.lastElementChild?.classList.contains('panel-dock')).toBe(true);
    expect((panel.lastElementChild as HTMLElement).hidden).toBe(false);

    root.querySelector<HTMLButtonElement>('[data-tab="upgrades"]')!.click();
    expect((panel.lastElementChild as HTMLElement).hidden).toBe(true);
  });

  it('claims a ready docket filing and replaces Claim with Claimed', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.totalClicks = 10;
    const ui = makeUi(root, {
      initialTab: 'docket',
      onClaimQuest: (id) => {
        state.quests.claimed.push(id);
        return { kind: 'resource', resource: 'broth', amount: 50 };
      },
    });

    ui.renderLists(state);
    const claim = root.querySelector<HTMLButtonElement>('.quest-claim')!;
    expect(claim.getAttribute('aria-label')).toBe('Claim First Scoop on Record');
    claim.click();
    expect(root.querySelector('.quest-claim')).toBeNull();
    expect(root.textContent).toContain('Claimed ✓');
  });

  it('renders research progress, cancel, duration, and queue-full state', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.researchQueue = [{ id: RESEARCH[0].id, remaining: 30 }];
    state.compute = 1_000_000;
    const ui = makeUi(root, { initialTab: 'research' });

    ui.renderLists(state);
    expect(root.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(root.querySelector('.research-cancel')).not.toBeNull();
    expect(root.textContent).toContain('30s');

    state.researchQueue = RESEARCH.slice(0, 3).map((item) => ({ id: item.id, remaining: 20 }));
    ui.renderLists(state);
    expect(root.textContent).toContain('Queue full');
  });

  it('renders fieldwork controls and resource visibility', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    const ui = makeUi(root, {
      onCalibrate: () => true,
    });

    ui.renderCounters(state);
    expect(root.querySelector('[data-resource="peat"]')?.hasAttribute('hidden')).toBe(true);
    state.totalPeatEarned = 1;
    ui.renderCounters(state);
    expect(root.querySelector('[data-resource="peat"]')?.hasAttribute('hidden')).toBe(false);

    state.buildings.rack = 1;
    ui.renderFieldwork(state);
    const calibrate = root.querySelector<HTMLButtonElement>('#calibrate-btn')!;
    expect(root.querySelector('#cut-btn')).not.toBeNull();
    calibrate.click();
    expect(calibrate.disabled).toBe(true);
  });
});
