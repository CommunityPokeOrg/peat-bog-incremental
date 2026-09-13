// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RESEARCH } from '../src/game/data';
import { calibrate } from '../src/game/minigames';
import { createInitialState } from '../src/game/state';
import { createUi } from '../src/ui/app';
import { formatQuestReward } from '../src/ui/text';

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('renders Night Watch and disables it at the maximum level', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    const ui = makeUi(root, { initialTab: 'upgrades' });
    ui.renderLists(state);
    const row = root.querySelector<HTMLElement>('[data-key="night-watch"]')!;
    expect(row.textContent).toContain('Lv 0/49');
    state.nightWatch = 49;
    ui.renderLists(state);
    expect(row.textContent).toContain('Maxed');
    expect((row as HTMLButtonElement).disabled).toBe(true);
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

  it('renders the Keepers of the Bog docket chapter', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    const ui = makeUi(root, { initialTab: 'docket' });
    ui.renderLists(state);
    expect(root.textContent).toContain('Keepers of the Bog · 0/10 claimed');
    expect(root.textContent).toContain('Pierre of the Peat');
    expect(root.textContent).toContain('Poke, Oracle of the Bog');
  });

  it('clamps docket progress text and formats multiplier rewards precisely', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.totalClicks = 999;
    const ui = makeUi(root, { initialTab: 'docket' });

    ui.renderCounters(state);
    ui.renderLists(state);

    expect(root.querySelector('#next-hint')?.textContent).toContain('(10 / 10)');
    expect(root.querySelector('.quest-progress')?.textContent).toBe('10 / 10');
    expect(formatQuestReward({
      kind: 'multiplier',
      target: 'compute',
      factor: 1.15,
    })).toBe('compute ×1.15');
    expect(formatQuestReward({
      kind: 'multiplier',
      target: 'broth',
      factor: 1.25,
    })).toBe('broth ×1.25');
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
      onCalibrate: () => ({
        hit: true,
        compute: 2,
        evidence: 0.2,
        streak: 1,
        multiplier: 1,
      }),
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
    expect(root.querySelector('#calibrate-live')?.textContent).toContain('streak 1');
  });

  it('passes the rendered calibration needle position to the hook', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.buildings.rack = 1;
    let received = -1;
    let result: ReturnType<typeof calibrate> | undefined;
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const ui = makeUi(root, {
      onCalibrate: (needlePos) => {
        received = needlePos;
        result = calibrate(state, needlePos, () => 0.5);
        return result;
      },
    });

    ui.renderFieldwork(state, 65);
    ui.renderFieldwork(state, 125);
    now.mockReturnValue(135);
    root.querySelector<HTMLButtonElement>('#calibrate-btn')!.click();

    expect(result?.hit).toBe(true);
    expect(received).toBeCloseTo(0.5 + 0.5 * Math.sin((2 * Math.PI * 65) / 4084));
  });

  it('ignores a visibly green frame older than the grace window', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.buildings.rack = 1;
    let result: ReturnType<typeof calibrate> | undefined;
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const ui = makeUi(root, {
      onCalibrate: (needlePos) => {
        result = calibrate(state, needlePos);
        return result;
      },
    });

    ui.renderFieldwork(state, 65);
    ui.renderFieldwork(state, 365);
    now.mockReturnValue(375);
    root.querySelector<HTMLButtonElement>('#calibrate-btn')!.click();

    expect(result?.hit).toBe(false);
  });

  it('renders the three Charter branches and signs a term', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.bogCores = 1;
    const ui = makeUi(root, { initialTab: 'charter' });
    ui.renderLists(state);
    expect(root.textContent).toContain('Roots · 0/4');
    expect(root.textContent).toContain('Kindling · 0/4');
    expect(root.textContent).toContain('Filing · 0/5');
    const row = root.querySelector<HTMLElement>('[data-key="charter-roots-1"]')!;
    expect(row.textContent).toContain('Sign');
    row.click();
    expect(root.textContent).toContain('Signed ✓');
  });

  it('shows the sphagnum Production filter when its nursery is owned', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.buildings.nursery = 1;
    const ui = makeUi(root);
    ui.renderLists(state);
    expect(root.querySelector('[data-filter="sphagnum"]')).not.toBeNull();
  });

  it('cools down for 5 s only after a miss', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.buildings.rack = 1;
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    const ui = makeUi(root, {
      onCalibrate: (needlePos) => calibrate(state, needlePos, () => 0.5),
    });
    const btn = root.querySelector<HTMLButtonElement>('#calibrate-btn')!;

    ui.renderFieldwork(state, 65);
    now.mockReturnValue(70);
    btn.click();
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toBe('Calibrate');

    ui.renderFieldwork(state, 365);
    now.mockReturnValue(370);
    btn.click();
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe('Cooling down…');
    ui.renderFieldwork(state, 5369);
    expect(btn.disabled).toBe(true);
    ui.renderFieldwork(state, 5371);
    expect(btn.disabled).toBe(false);
  });
});
