import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

describe('list layout rules', () => {
  it('keeps rows from shrinking and lets their content wrap', () => {
    const itemRule = css.match(/\.item\s*\{([^}]*)\}/)?.[1] ?? '';
    const bodyRule = css.match(/\.item-body\s*\{([^}]*)\}/)?.[1] ?? '';
    const tabContentChildShrink = /\.tab-content\s*>\s*[^}]*flex-shrink\s*:\s*[1-9]/.test(css);

    expect(itemRule).toMatch(/display:\s*grid/);
    expect(itemRule).toMatch(/flex-shrink:\s*0/);
    expect({
      bodyHasMinWidth: /min-width:\s*0/.test(bodyRule),
      tabContentChildShrink,
    }).toEqual({ bodyHasMinWidth: true, tabContentChildShrink: false });
  });

  it('greys out the Buy pill on unaffordable rows', () => {
    const disabledPill = css.match(/button\.item:disabled \.item-action\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(disabledPill).toMatch(/background:\s*var\(--bog-3\)/);
    expect(disabledPill).toMatch(/color:\s*var\(--ink-faint\)/);
  });
});
