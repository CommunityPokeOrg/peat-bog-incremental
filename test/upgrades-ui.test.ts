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
    initialTab: 'upgrades',
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('tool-shed upgrades UI', () => {
  it('groups available tools under a labelled rail and shows silhouettes', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.wallet.broth = D(100);
    state.wallet.peat = D(100);
    state.lifetime.broth = D(100);
    state.lifetime.peat = D(100);
    const ui = makeUi(root);

    ui.renderLists(state);

    const spade = root.querySelector<HTMLElement>('[data-key="spade"]')!;
    expect(spade.classList.contains('tool')).toBe(true);
    expect(spade.dataset.group).toBe('click');
    expect(spade.previousElementSibling?.classList.contains('rail')).toBe(true);
    expect(spade.previousElementSibling?.querySelector('.rail-label')?.textContent).toBe('Hand tools');
    expect(root.querySelector('.silhouette[data-key^="soon-"]')).not.toBeNull();
  });

  it('shows emoji cost parts marked by affordability', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.wallet.broth = D(100);
    state.wallet.peat = D(100);
    state.lifetime.broth = D(100);
    state.lifetime.peat = D(100);
    const ui = makeUi(root);

    ui.renderLists(state);

    const part = root.querySelector<HTMLElement>('[data-key="spade"] .item-cost .cost-part')!;
    expect(part.dataset.resource).toBe('broth');
    expect(part.dataset.affordable).toBe('true');
    expect(part.textContent).toContain('🫧');
    expect(part.querySelector('.cost-amount')?.textContent).toBe('50');
    expect(part.querySelector('.sr-only')?.textContent).toContain('fp16 compute broth');

    state.wallet.broth = D(0);
    ui.renderLists(state);
    expect(root.querySelector<HTMLElement>('[data-key="spade"] .cost-part')!.dataset.affordable).toBe('false');
  });

  it('keeps a fixed row order when wallet amounts change', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.wallet.broth = D(100);
    state.wallet.peat = D(100);
    state.lifetime.broth = D(100);
    state.lifetime.peat = D(100);
    const ui = makeUi(root);

    const keys = () =>
      [...root.querySelectorAll<HTMLElement>('[data-key]')].map((el) => el.dataset.key);

    ui.renderLists(state);
    const poorOrder = keys();

    state.wallet.broth = D(1e9);
    ui.renderLists(state);
    expect(keys()).toEqual(poorOrder);

    state.wallet.broth = D(0);
    ui.renderLists(state);
    expect(keys()).toEqual(poorOrder);
  });

  it('moves a bought tool into the owned drawer', () => {
    const root = document.createElement('div');
    const state = createInitialState();
    state.wallet.broth = D(100);
    state.wallet.peat = D(100);
    state.lifetime.broth = D(100);
    state.lifetime.peat = D(100);
    const ui = makeUi(root);

    ui.renderLists(state);
    root.querySelector<HTMLElement>('[data-key="spade"]')!.click();

    expect(root.querySelector('[data-key="spade"]')).toBeNull();
    expect(root.querySelector('[data-upgrade-id="spade"]')).not.toBeNull();
  });
});
