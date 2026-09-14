// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { D } from '../src/game/decimal';
import { productionPerSecond } from '../src/game/engine';
import { createInitialState } from '../src/game/state';
import { createUi } from '../src/ui/app';

function makeUi(root: HTMLElement) {
  return createUi(root, {
    onHarvest: () => {},
    onPrestige: () => {},
    onSaveNow: () => {},
    onExport: () => '',
    onImport: () => false,
    onHardReset: () => {},
    initialTab: 'buildings',
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('still-room manifold UI', () => {
  it('shows flowing, closed, and starved converter states', () => {
    const freshRoot = document.createElement('div');
    const freshUi = makeUi(freshRoot);
    freshUi.renderLists(createInitialState());
    expect(freshRoot.querySelector('.manifold')).toBeNull();

    const root = document.createElement('div');
    const state = createInitialState();
    state.research.push('still-method');
    state.revealed.push('quantum-hall');
    state.buildings['copper-still'] = 1;
    state.wallet.broth = D(1_000_000);
    state.wallet.methane = D(1_000_000);
    state.wallet.peat = D(1);
    state.wallet.sludge = D(1);
    state.wallet.briquettes = D(1);
    state.wallet.evidence = D(1);
    state.wallet.refinedBroth = D(1);
    state.lifetime.broth = D(1_000_000);
    const ui = makeUi(root);

    ui.renderLists(state);

    const run = root.querySelector<HTMLElement>('.pipe-run[data-line="refinedBroth"]')!;
    expect(run.dataset.state).toBe('flowing');
    expect(run.querySelector<HTMLElement>('.run-label')?.textContent).toContain('Refined broth');
    const idleRun = root.querySelector<HTMLElement>('.pipe-run[data-line="compute"]')!;
    expect(idleRun.dataset.state).toBe('idle');
    expect(idleRun.querySelector('.vessel b')?.textContent).toBe('—');
    const valve = run.querySelector<HTMLButtonElement>('.valve')!;
    valve.click();
    expect(valve.getAttribute('aria-pressed')).toBe('false');
    expect(run.dataset.state).toBe('closed');
    expect(productionPerSecond(state).refinedBroth.eq(0)).toBe(true);

    valve.click();
    state.wallet.methane = D(0);
    ui.renderLists(state);
    expect(run.dataset.state).toBe('starved');
  });
});
