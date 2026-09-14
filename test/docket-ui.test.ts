// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
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
    initialTab: 'docket',
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('docket case board UI', () => {
  it('renders a ready dossier and stamps it closed with its reward', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.totalClicks = 10;
    const ui = makeUi(root);

    ui.renderLists(state);

    const dossier = root.querySelector<HTMLElement>('[data-key="q-first-scoop"]')!;
    expect(dossier.classList.contains('dossier')).toBe(true);
    expect(dossier.classList.contains('ready')).toBe(true);
    const stamp = dossier.querySelector<HTMLButtonElement>('.stamp')!;
    expect(stamp.hidden).toBe(false);
    stamp.click();

    const closed = root.querySelector<HTMLElement>('[data-key="q-first-scoop"]')!;
    expect(closed.classList.contains('claimed')).toBe(true);
    expect(closed.querySelector<HTMLElement>('.stamp-ink')?.hidden).toBe(false);
    expect(state.wallet.broth.toNumber()).toBe(50);
  });
});
