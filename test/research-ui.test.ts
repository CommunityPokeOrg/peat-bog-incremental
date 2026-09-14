// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { RESEARCH } from '../src/game/data';
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
    initialTab: 'research',
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('research constellation UI', () => {
  it('selects a star and updates the detail panel', () => {
    const root = document.createElement('div');
    const ui = makeUi(root);
    const state = createInitialState();
    ui.renderLists(state);
    const star = root.querySelector<HTMLButtonElement>('.research-star:not([hidden])')!;
    const id = star.dataset.research!;
    star.click();
    expect(root.querySelector(`[data-research="${id}"]`)?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('.research-detail .charter-detail-name')?.textContent)
      .toBe(RESEARCH.find((research) => research.id === id)?.name);
  });

  it('marks queued research stars as queued', () => {
    const root = document.createElement('div');
    const ui = makeUi(root);
    const state = createInitialState();
    state.researchQueue = [{ id: RESEARCH[0].id, remaining: 30 }];
    ui.renderLists(state);
    expect(root.querySelector<HTMLElement>(`[data-research="${RESEARCH[0].id}"]`)?.dataset.status).toBe('queued');
  });

  it('hides stars whose prerequisites have not been discovered', () => {
    const root = document.createElement('div');
    const ui = makeUi(root);
    ui.renderLists(createInitialState());
    const hidden = root.querySelector<HTMLButtonElement>('[data-research="thermal-docket"]');
    expect(hidden).not.toBeNull();
    expect(hidden?.hidden).toBe(true);
    expect(hidden?.hasAttribute('hidden')).toBe(true);
  });
});
