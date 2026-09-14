// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { D } from '../src/game/decimal';
import { CHARTER } from '../src/game/charter';
import { RESEARCH } from '../src/game/data';
import { calibrate } from '../src/game/minigames';
import { createInitialState } from '../src/game/state';
import { createUi } from '../src/ui/app';
import { layoutCharter } from '../src/ui/charterLayout';
import { CHARTER_MAX_SCALE, CHARTER_ZOOM_STEP } from '../src/ui/charterView';
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

function setCanvasSize(canvas: HTMLElement, width = 400, height = 300): void {
  Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(canvas, 'clientHeight', { configurable: true, value: height });
  canvas.getBoundingClientRect = () => ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

function pointerEvent(type: string, x: number, y: number, pointerId = 1): MouseEvent {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerId', { configurable: true, value: pointerId });
  return event;
}

function sheetTransform(canvas: HTMLElement): { x: number; y: number; scale: number } {
  const transform = canvas.querySelector<HTMLElement>('.charter-sheet')!.style.transform;
  const match = transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.]+)\)/);
  if (!match) throw new Error(`Unexpected charter transform: ${transform}`);
  return { x: Number(match[1]), y: Number(match[2]), scale: Number(match[3]) };
}

describe('UI overhaul', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses a place-specific scene for each panel tab', () => {
    const root = document.createElement('div');
    const ui = makeUi(root);
    ui.renderLists(createInitialState());
    const panel = root.querySelector<HTMLElement>('.panel')!;
    expect(panel.dataset.scene).toBe('cut');
    root.querySelector<HTMLButtonElement>('[data-tab="charter"]')!.click();
    expect(panel.dataset.scene).toBe('sky');
  });

  it('keeps sound off by default and mirrors the header toggle in Settings', () => {
    localStorage.removeItem('peat-bog:sound');
    const root = document.createElement('div');
    const ui = makeUi(root);
    ui.renderLists(createInitialState());
    const toggle = root.querySelector<HTMLButtonElement>('#sound-toggle')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('peat-bog:sound')).toBe('1');
    root.querySelector<HTMLButtonElement>('[data-tab="settings"]')!.click();
    expect(root.querySelector<HTMLInputElement>('#set-sound')!.checked).toBe(true);
  });

  it('pops the owned count after buying a building', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.wallet.broth = D(100_000);
    const ui = makeUi(root);
    ui.renderLists(state);
    root.querySelector<HTMLButtonElement>('[data-key="harvester"]')!.click();
    expect(root.querySelector('[data-key="harvester"] .owned')?.classList.contains('pop')).toBe(true);
  });

  it('appends nine ambient wisps to the app shell', () => {
    const root = document.createElement('div');
    makeUi(root);
    const wisps = root.querySelector('.wisps')!;
    expect(wisps.getAttribute('aria-hidden')).toBe('true');
    expect(wisps.children).toHaveLength(9);
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
    for (const resource of Object.keys(state.wallet) as Array<keyof typeof state.wallet>) {
      state.wallet[resource] = D(1);
      if (resource !== 'bogCores') state.lifetime[resource] = D(1);
    }
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

  it('hides undiscovered resource content until its line is opened', () => {
    const root = document.createElement('div');
    const ui = makeUi(root, { initialTab: 'docket' });
    const state = createInitialState();
    ui.renderLists(state);
    const text = () => root.querySelector('#tab-content')?.textContent?.toLowerCase() ?? '';
    expect(text()).not.toContain('briquette');
    expect(text()).not.toContain('sludge');
    root.querySelector<HTMLButtonElement>('[data-tab="buildings"]')!.click();
    expect(text()).not.toContain('refined broth');
    root.querySelector<HTMLButtonElement>('[data-tab="research"]')!.click();
    expect(text()).not.toContain('refined broth');
  });

  it('keeps a claim button stable across renders', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.totalClicks = 10;
    const ui = makeUi(root, { initialTab: 'docket' });
    ui.renderLists(state);
    const claim = root.querySelector<HTMLButtonElement>('.quest-claim')!;
    ui.renderLists(state);
    ui.renderLists(state);
    expect(root.querySelector<HTMLButtonElement>('.quest-claim, .quest-story-claim')).toBe(claim);
    expect(claim.disabled).toBe(false);
    claim.click();
    expect(state.quests.claimed).toContain('q-first-scoop');
  });

  it('lays toasts newest-first in a five-item deck', () => {
    const root = document.createElement('div');
    const ui = makeUi(root);
    ui.toast('one');
    ui.toast('two');
    ui.toast('three');
    const toasts = [...root.querySelectorAll<HTMLElement>('.toast')];
    expect(toasts.map((toast) => toast.textContent)).toEqual(['three', 'two', 'one']);
    expect(toasts.map((toast) => toast.style.getPropertyValue('--depth'))).toEqual(['0', '1', '2']);
  });

  it('renders research progress, cancel, duration, and queue-full state', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.researchQueue = [{ id: RESEARCH[0].id, remaining: 30 }];
    state.wallet.compute = D(1_000_000);
    const ui = makeUi(root, { initialTab: 'research' });

    ui.renderLists(state);
    expect(root.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(root.querySelector('.research-cancel')).not.toBeNull();
    expect(root.textContent).toContain('30s');

    state.researchQueue = RESEARCH.slice(0, 3).map((item) => ({ id: item.id, remaining: 20 }));
    ui.renderLists(state);
    root.querySelector<HTMLButtonElement>(`[data-research="${RESEARCH[3].id}"]`)!.click();
    expect(root.textContent).toContain('Queue full');
  });

  it('renders all research branches and rolls a claimed bounty forward', () => {
    const researchRoot = document.createElement('div');
    const researchUi = makeUi(researchRoot, { initialTab: 'research' });
    const researchState = createInitialState();
    researchState.research = RESEARCH.map((research) => research.id);
    researchUi.renderLists(researchState);
    for (const branch of ['Thermal', 'Extraction', 'Distillation', 'Litigation', 'Celestial']) {
      expect(researchRoot.textContent).toContain(branch);
    }

    const docketRoot = document.createElement('div');
    const state = createInitialState();
    state.lifetime.peat = D(10_000);
    const docketUi = makeUi(docketRoot, { initialTab: 'docket' });
    docketUi.renderLists(state);
    state.lifetime.peat = state.lifetime.peat.add(25_000);
    docketUi.renderLists(state);
    const claim = docketRoot.querySelector<HTMLButtonElement>(
      '[aria-label="Claim Peat Delivery Order ×1"]',
    );
    expect(claim).not.toBeNull();
    claim!.click();
    expect(docketRoot.textContent).toContain('Peat Delivery Order ×2');
  });

  it('renders fieldwork controls and resource visibility', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    const ui = makeUi(root, {
      onCalibrate: () => ({
        hit: true,
        compute: D(2),
        evidence: D(0.2),
        streak: 1,
        multiplier: 1,
      }),
    });

    ui.renderCounters(state);
    expect(root.querySelector('[data-resource="peat"]')?.hasAttribute('hidden')).toBe(true);
    state.lifetime.peat = D(1);
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

  it('renders the Charter as a node graph with matching states and signs from the detail panel', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.wallet.bogCores = D(1);
    const ui = makeUi(root, { initialTab: 'charter' });
    ui.renderLists(state);
    const node = (id: string): HTMLButtonElement =>
      root.querySelector<HTMLButtonElement>(`.charter-node[data-node="${id}"]`)!;
    const visibleNodes = () => CHARTER.filter((candidate) => {
      if (state.charter.includes(candidate.id)) return true;
      if (candidate.requires && !state.charter.includes(candidate.requires)) return false;
      return !candidate.requiresAny || candidate.requiresAny.some((id) => state.charter.includes(id));
    }).length;
    expect(root.querySelectorAll('.charter-node:not([hidden])')).toHaveLength(visibleNodes());
    expect(root.querySelectorAll('.charter-edges line')).toHaveLength(layoutCharter().edges.length);
    expect(node('seal').dataset.state).toBe('purchasable');
    expect(node('roots-1').dataset.state).toBe('locked');
    expect(node('roots-1').getAttribute('aria-label')).toContain('Locked');

    const sign = root.querySelector<HTMLButtonElement>('.charter-sign')!;
    expect(node('seal').getAttribute('aria-pressed')).toBe('true');
    expect(sign.disabled).toBe(false);
    sign.click();
    expect(state.charter).toEqual(['seal']);
    expect(node('seal').dataset.state).toBe('signed');
    expect(node('roots-1').dataset.state).toBe('unaffordable');
    expect(root.querySelectorAll('.charter-node:not([hidden])')).toHaveLength(visibleNodes());

    const roots = node('roots-1');
    roots.dispatchEvent(pointerEvent('pointerdown', 20, 20));
    roots.dispatchEvent(pointerEvent('pointerup', 20, 20));
    roots.click();
    expect(root.querySelector('.charter-detail-name')!.textContent).toBe('Deep Roots');
    expect(root.querySelector('.charter-sign')!.textContent).toBe('Sign');
    expect(root.querySelector<HTMLButtonElement>('.charter-sign')!.disabled).toBe(true);
  });

  it('zooms and resets the Charter camera with toolbar controls', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    const ui = makeUi(root, { initialTab: 'charter' });
    ui.renderLists(state);
    const canvas = root.querySelector<HTMLElement>('.charter-canvas')!;
    setCanvasSize(canvas);
    const zoomIn = root.querySelector<HTMLButtonElement>('[data-zoom="in"]')!;
    const zoomOut = root.querySelector<HTMLButtonElement>('[data-zoom="out"]')!;
    const reset = root.querySelector<HTMLButtonElement>('[data-zoom="reset"]')!;

    zoomIn.click();
    expect(sheetTransform(canvas).scale).toBeCloseTo(CHARTER_ZOOM_STEP);
    zoomOut.click();
    expect(sheetTransform(canvas).scale).toBeCloseTo(1);
    for (let i = 0; i < 10 && !zoomIn.disabled; i += 1) zoomIn.click();
    expect(sheetTransform(canvas).scale).toBeCloseTo(CHARTER_MAX_SCALE);
    expect(zoomIn.disabled).toBe(true);
    reset.click();
    expect(sheetTransform(canvas).scale).toBe(1);
  });

  it('wheel-zooms the Charter canvas and prevents page scrolling', () => {
    const root = document.createElement('div');
    const ui = makeUi(root, { initialTab: 'charter' });
    ui.renderLists(createInitialState());
    const canvas = root.querySelector<HTMLElement>('.charter-canvas')!;
    setCanvasSize(canvas);
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 200, clientY: 150, deltaY: -100 });
    canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(sheetTransform(canvas).scale).toBeCloseTo(CHARTER_ZOOM_STEP);
  });

  it('pans by pointer drag and suppresses the node click it starts over', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    const ui = makeUi(root, { initialTab: 'charter' });
    ui.renderLists(state);
    const canvas = root.querySelector<HTMLElement>('.charter-canvas')!;
    setCanvasSize(canvas);
    root.querySelector<HTMLButtonElement>('[data-zoom="reset"]')!.click();
    const before = sheetTransform(canvas);
    const node = root.querySelector<HTMLButtonElement>('.charter-node[data-node="seal"]')!;
    canvas.dispatchEvent(pointerEvent('pointerdown', 10, 10));
    canvas.dispatchEvent(pointerEvent('pointermove', 60, 60));
    node.dispatchEvent(pointerEvent('pointerup', 60, 60));
    const afterDrag = sheetTransform(canvas);
    expect(afterDrag.x).toBeCloseTo(before.x + 50);
    expect(afterDrag.y).toBeCloseTo(before.y + 50);
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(node.getAttribute('aria-pressed')).toBe('true');

    const other = root.querySelector<HTMLButtonElement>('.charter-node[data-node="roots-1"]')!;
    other.dispatchEvent(pointerEvent('pointerdown', 20, 20));
    other.dispatchEvent(pointerEvent('pointerup', 20, 20));
    other.click();
    expect(other.getAttribute('aria-pressed')).toBe('true');
  });

  it('pans the Charter camera with arrow keys', () => {
    const root = document.createElement('div');
    const ui = makeUi(root, { initialTab: 'charter' });
    ui.renderLists(createInitialState());
    const canvas = root.querySelector<HTMLElement>('.charter-canvas')!;
    setCanvasSize(canvas);
    root.querySelector<HTMLButtonElement>('[data-zoom="reset"]')!.click();
    const before = sheetTransform(canvas);
    canvas.focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(sheetTransform(canvas).x).toBeCloseTo(before.x + 40);
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
