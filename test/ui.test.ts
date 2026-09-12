// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/state';
import { createUi } from '../src/ui/app';

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
});
