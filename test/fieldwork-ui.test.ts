// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createUi } from '../src/ui/app';
import { createInitialState } from '../src/game/state';
import { D } from '../src/game/decimal';
import type { GameState } from '../src/game/state';

function mount(state: GameState) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const ui = createUi(root, {
    initialTab: 'fieldwork',
    onHarvest: () => {},
    onPrestige: () => {},
    onSaveNow: () => {},
    onExport: () => '',
    onImport: () => false,
    onHardReset: () => {},
    onFieldwork: (fn) => fn(state),
  });
  ui.renderLists(state);
  ui.renderFieldwork(state, 0);
  return { root, ui };
}

describe('fieldwork tab', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('hides games whose resource is undiscovered and shows the always-available ones', () => {
    const state = createInitialState();
    const { root } = mount(state);
    expect(root.querySelector<HTMLButtonElement>('.fw-site[data-game="strata"]')).not.toBeNull();
    expect(root.querySelector<HTMLElement>('.fw-sites .is-locked')).not.toBeNull();
  });

  it('ends a typing run on the first typo and pays evidence for finished words', () => {
    const state = createInitialState();
    state.lifetime.evidence = D(10);
    const { root, ui } = mount(state);
    root.querySelector<HTMLButtonElement>('.fw-site[data-game="typing"]')!.click();
    const card = root.querySelector<HTMLElement>('.fw-play [data-game="typing"]')!;
    card.querySelector<HTMLButtonElement>('.fw-start')!.click();
    const input = card.querySelector<HTMLInputElement>('.fw-input')!;
    const word = card.querySelector('.fw-word.is-current')!.textContent!;
    for (const char of word) {
      input.value = char;
      input.dispatchEvent(new Event('input'));
    }
    input.value = ' ';
    input.dispatchEvent(new Event('input'));
    input.value = '§';
    input.dispatchEvent(new Event('input'));

    expect(input.disabled).toBe(true);
    expect(state.wallet.evidence.gt(0)).toBe(true);
    expect(state.fieldwork.typing.runs).toBe(1);
    expect(card.querySelector('.fieldwork-live')!.textContent).toContain('evidence');
    ui.renderFieldwork(state, 0);
    expect(card.querySelector<HTMLButtonElement>('.fw-start')!.disabled).toBe(true);
  });

  it('cuts strata with the Space key', () => {
    const state = createInitialState();
    const { root } = mount(state);
    root.querySelector<HTMLButtonElement>('.fw-site[data-game="strata"]')!.click();
    const card = root.querySelector<HTMLElement>('.fw-play [data-game="strata"]')!;
    card.querySelector<HTMLButtonElement>('.fw-start')!.click();
    const face = card.querySelector<HTMLElement>('.fw-face')!;
    face.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(face.dataset.grade).toBeDefined();
  });

  it('opens one site at a time and returns to the hub', () => {
    const state = createInitialState();
    const { root } = mount(state);
    const site = root.querySelector<HTMLButtonElement>('.fw-site[data-game="strata"]')!;
    site.click();
    expect(root.querySelector<HTMLElement>('.fw-play')!.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('.fw-play')!.dataset.game).toBe('strata');
    root.querySelector<HTMLButtonElement>('.fw-back')!.click();
    expect(root.querySelector<HTMLElement>('.fw-hub')!.hidden).toBe(false);
  });

  it('cashes out a live run on back and Escape', () => {
    const state = createInitialState();
    state.lifetime.evidence = D(10);
    const { root } = mount(state);
    root.querySelector<HTMLButtonElement>('.fw-site[data-game="typing"]')!.click();
    const card = root.querySelector<HTMLElement>('.fw-play [data-game="typing"]')!;
    card.querySelector<HTMLButtonElement>('.fw-start')!.click();
    const before = state.wallet.evidence;
    root.querySelector<HTMLButtonElement>('.fw-back')!.click();
    expect(state.wallet.evidence.gt(before)).toBe(true);
    expect(root.querySelector<HTMLElement>('.fw-hub')!.hidden).toBe(false);
    root.querySelector<HTMLButtonElement>('.fw-site[data-game="typing"]')!.click();
    root.querySelector<HTMLElement>('.fw-play')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector<HTMLElement>('.fw-hub')!.hidden).toBe(false);
  });
});
