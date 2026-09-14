// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { D } from '../src/game/decimal';
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

describe('production cross-section UI', () => {
  it('renders production as strata and deepens a plot after buying', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.wallet.broth = D(100);
    const ui = makeUi(root);

    ui.renderLists(state);

    const harvester = root.querySelector<HTMLButtonElement>('[data-key="harvester"]')!;
    expect(harvester.classList.contains('plot')).toBe(true);
    expect(harvester.dataset.line).toBe('broth');
    expect(harvester.querySelector<HTMLElement>('.plot-dug')!.style.getPropertyValue('--dug')).toBe('0%');
    const heading = root.querySelector<HTMLElement>('[data-key="heading-broth"]')!;
    expect(heading.classList.contains('stratum-label')).toBe(true);
    expect(heading.querySelector('.stratum-depth')?.textContent).toBe('0 m');

    harvester.click();

    expect(Number.parseFloat(harvester.querySelector<HTMLElement>('.plot-dug')!.style.getPropertyValue('--dug'))).toBeGreaterThan(0);
  });

  it('renders the next blueprint as an undug locked plot', () => {
    const root = document.createElement('div');
    const ui = makeUi(root);

    ui.renderLists(createInitialState());

    const teaser = root.querySelector<HTMLElement>('[data-key="locked-dredger"]')!;
    expect(teaser.classList.contains('plot')).toBe(true);
    expect(teaser.classList.contains('undug')).toBe(true);
    expect(teaser.classList.contains('locked-teaser')).toBe(true);
    expect(teaser.textContent).toContain('Undug');
  });
});
