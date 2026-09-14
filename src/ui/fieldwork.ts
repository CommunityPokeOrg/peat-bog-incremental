import { FIELDWORK, fieldworkReady, fieldworkUnlocked, type FieldworkId } from '../game/fieldwork/shared';
import { endTyping, startTyping, typeChar, typingMultiplier, typingWpm, type TypingRun } from '../game/fieldwork/typing';
import { bladeDepth, cutStrata, endStrata, startStrata, type StrataRun } from '../game/fieldwork/strata';
import { advanceSettle, endSettle, moveValve, startSettle, type SettleRun } from '../game/fieldwork/settle';
import { advanceStill, endStill, startStill, tapStill, DROP_FALL_MS, type StillRun } from '../game/fieldwork/still';
import { advancePress, endPress, pedal, startPress, type PressRun } from '../game/fieldwork/press';
import {
  CONSTELLATION_STARS,
  endConstellation,
  pickStar,
  revealDone,
  startConstellation,
  type ConstellationRun,
} from '../game/fieldwork/constellation';
import type { GameState } from '../game/state';
import type { Decimal } from '../game/decimal';
import { formatNumber } from '../game/format';

/** Runs a mutation against the live game state and persists it. */
export type Mutate = <T>(fn: (state: GameState) => T) => T;

export interface FieldworkPanel {
  /** Per-frame update: advances live runs and repaints gauges. */
  render(state: GameState, now: number): void;
  /** Cashes out any live run early (tab switch, unmount); cooldowns still apply. */
  abandon(): void;
}

interface GameCard {
  id: FieldworkId;
  card: HTMLElement;
  live: HTMLElement;
  start: HTMLButtonElement;
  stage: HTMLElement;
  running(): boolean;
  begin(now: number): void;
  frame(now: number): void;
  /** Stops the run, pays out, and returns the awarded amount (undefined when nothing was live). */
  finish(now: number): Decimal | undefined;
}

const HOW_TO: Record<FieldworkId, string> = {
  typing: 'Type the words as they come. One typo ends the run; speed and streak multiply the evidence.',
  strata: 'The blade drops one stratum per beat. Cut (Space) on each line; miss the beat and the face collapses.',
  settle: 'Keep the valve inside the drifting band (slider, or ← →). Sludge settles while you hold it.',
  still: 'Drips fall from the lyne arm. Tap (Space) when a drop meets the line. Three misses and the still goes cold.',
  press: 'Pump the pedals alternately (A / L or ← →). Hold pressure in the green band; over-pump and the mould bursts.',
  constellation: 'Watch the stars light, then trace them in order. Each round adds a star; one wrong star and the sky clouds.',
};

const RESOURCE_LABEL: Record<FieldworkId, string> = {
  typing: 'evidence',
  strata: 'peat',
  settle: 'sludge',
  still: 'refined broth',
  press: 'briquettes',
  constellation: 'essence',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createFieldworkPanel(
  container: HTMLElement,
  mutate: Mutate,
  onAward: (amount: Decimal, resource: string) => void,
  rng: () => number = Math.random,
): FieldworkPanel {
  const grid = el('div', 'fieldwork-grid');
  container.replaceChildren(grid);
  const cards: GameCard[] = [];

  function shell(id: FieldworkId): { card: HTMLElement; live: HTMLElement; start: HTMLButtonElement; stage: HTMLElement } {
    const def = FIELDWORK.find((game) => game.id === id)!;
    const card = el('section', 'card fw-card');
    card.dataset.game = id;
    card.setAttribute('aria-labelledby', `fw-${id}-title`);
    const heading = el('div', 'card-heading');
    const titles = el('div');
    titles.appendChild(el('p', 'eyebrow', RESOURCE_LABEL[id]));
    const title = el('h2', undefined, def.name);
    title.id = `fw-${id}-title`;
    titles.appendChild(title);
    heading.appendChild(titles);
    const stat = el('span', 'fw-best');
    stat.dataset.role = 'best';
    heading.appendChild(stat);
    card.appendChild(heading);
    card.appendChild(el('p', 'fw-howto', HOW_TO[id]));
    const stage = el('div', `fw-stage fw-stage-${id}`);
    card.appendChild(stage);
    const row = el('div', 'fw-controls');
    const start = el('button', 'btn fw-start', 'Start');
    start.type = 'button';
    row.appendChild(start);
    const live = el('div', 'fieldwork-live');
    live.setAttribute('aria-live', 'polite');
    row.appendChild(live);
    card.appendChild(row);
    grid.appendChild(card);
    return { card, live, start, stage };
  }

  function report(game: GameCard, amount: Decimal | undefined, summary: string): void {
    if (!amount) return;
    game.live.textContent = `${summary} +${formatNumber(amount)} ${RESOURCE_LABEL[game.id]}.`;
    onAward(amount, FIELDWORK.find((def) => def.id === game.id)!.resource);
  }

  // ---- Typing ------------------------------------------------------------
  {
    const { card, live, start, stage } = shell('typing');
    const queue = el('div', 'fw-words');
    queue.setAttribute('aria-hidden', 'true');
    const input = el('input', 'fw-input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Type the highlighted word');
    input.placeholder = 'Start, then type here';
    input.disabled = true;
    const meter = el('div', 'fw-meter');
    stage.append(queue, input, meter);
    let run: TypingRun | null = null;

    const paint = (now: number): void => {
      if (!run) return;
      queue.replaceChildren(...run.queue.slice(0, 6).map((word, index) => {
        const span = el('span', 'fw-word');
        if (index === 0) {
          span.classList.add('is-current');
          const done = el('b', undefined, word.slice(0, run!.typed.length));
          span.append(done, word.slice(run!.typed.length));
        } else {
          span.textContent = word;
        }
        return span;
      }));
      const wpm = typingWpm(run, now);
      meter.textContent = `${Math.round(wpm)} wpm · ${run.wordsDone} words · ×${typingMultiplier(wpm, run.wordsDone).toFixed(2)}`;
    };

    const game: GameCard = {
      id: 'typing', card, live, start, stage,
      running: () => run !== null && run.alive,
      begin(now) {
        run = startTyping(rng, now);
        input.disabled = false;
        input.value = '';
        input.focus();
        live.textContent = 'Run live — type the highlighted word.';
        paint(now);
      },
      frame(now) { paint(now); },
      finish(now) {
        if (!run) return undefined;
        const ended = run;
        run = null;
        input.disabled = true;
        input.value = '';
        queue.replaceChildren();
        const result = mutate((state) => endTyping(state, ended, now));
        report(game, result.evidence, `${result.words} words at ${Math.round(result.wpm)} wpm.`);
        return result.evidence;
      },
    };

    input.addEventListener('input', () => {
      if (!run || !run.alive) return;
      const now = performance.now();
      for (const char of input.value) {
        run = typeChar(run, char, now, rng);
        if (!run.alive) break;
      }
      input.value = '';
      if (!run.alive) {
        live.textContent = 'Typo — the deposition is struck.';
        card.classList.add('fw-fail');
        setTimeout(() => card.classList.remove('fw-fail'), 400);
        game.finish(now);
      } else {
        paint(now);
      }
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && run?.alive) {
        run = typeChar(run, ' ', performance.now(), rng);
        paint(performance.now());
      }
    });
    cards.push(game);
  }

  // ---- Strata ------------------------------------------------------------
  {
    const { card, live, start, stage } = shell('strata');
    const face = el('div', 'fw-face');
    for (let i = 0; i < 5; i += 1) face.appendChild(el('span', 'fw-stratum'));
    const blade = el('span', 'fw-blade');
    face.appendChild(blade);
    const cut = el('button', 'fieldwork-btn fw-action', 'Cut');
    cut.type = 'button';
    cut.disabled = true;
    const combo = el('div', 'fw-meter');
    stage.append(face, cut, combo);
    let run: StrataRun | null = null;

    const game: GameCard = {
      id: 'strata', card, live, start, stage,
      running: () => run !== null && run.alive,
      begin(now) {
        run = startStrata(now);
        cut.disabled = false;
        cut.focus();
        live.textContent = 'Blade dropping — cut on each line.';
      },
      frame(now) {
        if (!run) return;
        face.style.setProperty('--depth', String(bladeDepth(run, now)));
        combo.textContent = `${run.cuts} cuts · combo ${run.combo}`;
      },
      finish() {
        if (!run) return undefined;
        const ended = run;
        run = null;
        cut.disabled = true;
        const peat = mutate((state) => endStrata(state, ended));
        report(game, peat, `${ended.cuts} cuts, best combo ${ended.combo}.`);
        return peat;
      },
    };
    const doCut = (): void => {
      if (!run?.alive) return;
      const now = performance.now();
      const result = cutStrata(run, now);
      run = result.run;
      face.dataset.grade = result.grade;
      if (result.grade === 'miss') {
        live.textContent = 'Off the beat — the face collapsed.';
        game.finish(now);
      }
    };
    cut.addEventListener('click', doCut);
    card.addEventListener('keydown', (event) => {
      if (event.key === ' ' && event.target !== cut) { event.preventDefault(); doCut(); }
    });
    cards.push(game);
  }

  // ---- Settle ------------------------------------------------------------
  {
    const { card, live, start, stage } = shell('settle');
    const tank = el('div', 'fw-tank');
    const band = el('span', 'fw-band');
    const valveMark = el('span', 'fw-valve');
    tank.append(band, valveMark);
    const slider = el('input', 'fw-slider');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1000';
    slider.value = '500';
    slider.disabled = true;
    slider.setAttribute('aria-label', 'Sludge valve');
    const stop = el('button', 'fieldwork-btn fw-action', 'Stop & collect');
    stop.type = 'button';
    stop.disabled = true;
    const meter = el('div', 'fw-meter');
    stage.append(tank, slider, stop, meter);
    let run: SettleRun | null = null;

    const game: GameCard = {
      id: 'settle', card, live, start, stage,
      running: () => run !== null && run.alive,
      begin(now) {
        run = startSettle(now, rng);
        slider.disabled = false;
        stop.disabled = false;
        slider.value = String(Math.round(run.valve * 1000));
        slider.focus();
        live.textContent = 'Settling — keep the valve in the band.';
      },
      frame(now) {
        if (!run) return;
        if (run.alive) run = advanceSettle(run, now, rng);
        tank.style.setProperty('--band', String(run.band));
        tank.style.setProperty('--half', String(run.bandHalf));
        tank.style.setProperty('--valve', String(run.valve));
        meter.textContent = `${(run.inBandMs / 1000).toFixed(1)} s settled`;
        if (!run.alive) {
          live.textContent = 'Valve drifted — the tank churned.';
          game.finish(now);
        }
      },
      finish() {
        if (!run) return undefined;
        const ended = run;
        run = null;
        slider.disabled = true;
        stop.disabled = true;
        const sludge = mutate((state) => endSettle(state, ended));
        report(game, sludge, `${(ended.inBandMs / 1000).toFixed(1)} s in band.`);
        return sludge;
      },
    };
    slider.addEventListener('input', () => {
      if (!run?.alive) return;
      run = moveValve(run, Number(slider.value) / 1000 - run.valve);
    });
    stop.addEventListener('click', () => game.finish(performance.now()));
    cards.push(game);
  }

  // ---- Still -------------------------------------------------------------
  {
    const { card, live, start, stage } = shell('still');
    const column = el('div', 'fw-column');
    const line = el('span', 'fw-catchline');
    column.appendChild(line);
    const tap = el('button', 'fieldwork-btn fw-action', 'Catch');
    tap.type = 'button';
    tap.disabled = true;
    const meter = el('div', 'fw-meter');
    stage.append(column, tap, meter);
    let run: StillRun | null = null;
    const dropEls = new Map<number, HTMLElement>();

    const game: GameCard = {
      id: 'still', card, live, start, stage,
      running: () => run !== null && run.alive,
      begin(now) {
        run = startStill(now, rng);
        tap.disabled = false;
        tap.focus();
        live.textContent = 'Drips falling — catch them on the line.';
      },
      frame(now) {
        if (!run) return;
        if (run.alive) run = advanceStill(run, now, rng);
        const alive = new Set(run.drops.map((drop) => drop.spawnedAt));
        for (const [key, node] of dropEls) if (!alive.has(key)) { node.remove(); dropEls.delete(key); }
        for (const drop of run.drops) {
          let node = dropEls.get(drop.spawnedAt);
          if (!node) {
            node = el('span', 'fw-drop');
            column.appendChild(node);
            dropEls.set(drop.spawnedAt, node);
          }
          node.style.setProperty('--p', String(Math.min(1.15, (now - drop.spawnedAt) / DROP_FALL_MS)));
        }
        meter.textContent = `${run.caught} caught · ${run.missed}/3 missed`;
        if (!run.alive) {
          live.textContent = 'The still went cold.';
          game.finish(now);
        }
      },
      finish() {
        if (!run) return undefined;
        const ended = run;
        run = null;
        tap.disabled = true;
        for (const node of dropEls.values()) node.remove();
        dropEls.clear();
        const broth = mutate((state) => endStill(state, ended));
        report(game, broth, `${ended.caught} drips caught.`);
        return broth;
      },
    };
    const doTap = (): void => {
      if (!run?.alive) return;
      const result = tapStill(run, performance.now());
      run = result.run;
      column.dataset.hit = result.hit ? 'yes' : 'no';
    };
    tap.addEventListener('click', doTap);
    card.addEventListener('keydown', (event) => {
      if (event.key === ' ' && event.target !== tap) { event.preventDefault(); doTap(); }
    });
    cards.push(game);
  }

  // ---- Press -------------------------------------------------------------
  {
    const { card, live, start, stage } = shell('press');
    const gauge = el('div', 'fw-gauge');
    gauge.setAttribute('role', 'meter');
    gauge.setAttribute('aria-label', 'Press pressure');
    gauge.setAttribute('aria-valuemin', '0');
    gauge.setAttribute('aria-valuemax', '100');
    gauge.appendChild(el('span', 'fw-gauge-band'));
    gauge.appendChild(el('span', 'fw-gauge-fill'));
    const pedals = el('div', 'fw-pedals');
    const left = el('button', 'fieldwork-btn fw-action', 'Left pedal (A)');
    const right = el('button', 'fieldwork-btn fw-action', 'Right pedal (L)');
    left.type = 'button';
    right.type = 'button';
    left.disabled = true;
    right.disabled = true;
    pedals.append(left, right);
    const meter = el('div', 'fw-meter');
    stage.append(gauge, pedals, meter);
    let run: PressRun | null = null;

    const game: GameCard = {
      id: 'press', card, live, start, stage,
      running: () => run !== null && run.alive,
      begin(now) {
        run = startPress(now);
        left.disabled = false;
        right.disabled = false;
        left.focus();
        live.textContent = 'Pump alternately — hold the green band.';
      },
      frame(now) {
        if (!run) return;
        if (run.alive) run = advancePress(run, now);
        gauge.style.setProperty('--pressure', String(run.pressure));
        gauge.setAttribute('aria-valuenow', String(Math.round(run.pressure * 100)));
        meter.textContent = `${(run.compressedMs / 1000).toFixed(1)} s compressed`;
        if (!run.alive) {
          live.textContent = 'Over-pumped — the mould burst.';
          game.finish(now);
        }
      },
      finish() {
        if (!run) return undefined;
        const ended = run;
        run = null;
        left.disabled = true;
        right.disabled = true;
        const briquettes = mutate((state) => endPress(state, ended));
        report(game, briquettes, `${(ended.compressedMs / 1000).toFixed(1)} s under pressure.`);
        return briquettes;
      },
    };
    const doPedal = (side: 'L' | 'R'): void => {
      if (!run?.alive) return;
      run = pedal(run, side, performance.now());
      pedals.dataset.last = side;
    };
    left.addEventListener('click', () => doPedal('L'));
    right.addEventListener('click', () => doPedal('R'));
    card.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') { event.preventDefault(); doPedal('L'); }
      if (key === 'l' || key === 'arrowright') { event.preventDefault(); doPedal('R'); }
    });
    cards.push(game);
  }

  // ---- Constellation -----------------------------------------------------
  {
    const { card, live, start, stage } = shell('constellation');
    const sky = el('div', 'fw-sky');
    sky.setAttribute('role', 'group');
    sky.setAttribute('aria-label', 'Stars');
    const stars: HTMLButtonElement[] = [];
    for (let i = 0; i < CONSTELLATION_STARS; i += 1) {
      const star = el('button', 'fw-star');
      star.type = 'button';
      star.disabled = true;
      star.setAttribute('aria-label', `Star ${i + 1}`);
      star.style.setProperty('--i', String(i));
      star.textContent = String(i + 1);
      stars.push(star);
      sky.appendChild(star);
    }
    const meter = el('div', 'fw-meter');
    stage.append(sky, meter);
    let run: ConstellationRun | null = null;
    let revealTimer = 0;

    const setStars = (enabled: boolean): void => { for (const star of stars) star.disabled = !enabled; };
    const reveal = (): void => {
      if (!run) return;
      setStars(false);
      const sequence = [...run.sequence];
      let index = 0;
      window.clearInterval(revealTimer);
      revealTimer = window.setInterval(() => {
        stars.forEach((star) => star.classList.remove('is-lit'));
        if (index >= sequence.length) {
          window.clearInterval(revealTimer);
          if (run) { run = revealDone(run); setStars(true); stars[0].focus(); live.textContent = 'Your turn — trace the stars.'; }
          return;
        }
        stars[sequence[index]].classList.add('is-lit');
        index += 1;
      }, 550);
    };

    const game: GameCard = {
      id: 'constellation', card, live, start, stage,
      running: () => run !== null && run.alive,
      begin() {
        run = startConstellation(rng);
        live.textContent = 'Watch the sky.';
        reveal();
      },
      frame() {
        if (!run) return;
        meter.textContent = `round ${run.round} · ${run.sequence.length} stars`;
      },
      finish() {
        if (!run) return undefined;
        const ended = run;
        run = null;
        window.clearInterval(revealTimer);
        setStars(false);
        stars.forEach((star) => star.classList.remove('is-lit'));
        const essence = mutate((state) => endConstellation(state, ended));
        report(game, essence, `${ended.round - 1} rounds traced.`);
        return essence;
      },
    };
    stars.forEach((star, index) => star.addEventListener('click', () => {
      if (!run?.alive || run.showing) return;
      run = pickStar(run, index, rng);
      star.classList.add('is-lit');
      setTimeout(() => star.classList.remove('is-lit'), 200);
      if (!run.alive) {
        live.textContent = 'Wrong star — the sky clouded.';
        game.finish(performance.now());
      } else if (run.showing) {
        live.textContent = 'Constellation grows — watch again.';
        reveal();
      }
    }));
    cards.push(game);
  }

  for (const game of cards) {
    game.start.addEventListener('click', () => {
      const now = performance.now();
      if (game.running()) { game.finish(now); return; }
      game.begin(now);
    });
  }

  return {
    render(state, now) {
      const wall = Date.now();
      for (const game of cards) {
        const unlocked = fieldworkUnlocked(state, game.id);
        game.card.hidden = !unlocked;
        if (!unlocked) continue;
        const stats = state.fieldwork[game.id];
        const best = game.card.querySelector<HTMLElement>('[data-role="best"]')!;
        best.textContent = stats.runs === 0 ? 'no runs yet' : `best ${Math.round(stats.best * 10) / 10}${game.id === 'typing' ? ' wpm' : ''} · ${stats.runs} runs`;
        const live = game.running();
        const ready = fieldworkReady(state, game.id, wall);
        game.start.textContent = live ? 'Stop' : ready ? 'Start' : `Ready in ${Math.ceil((stats.cooldownUntil - wall) / 1000)} s`;
        game.start.disabled = !live && !ready;
        game.card.classList.toggle('is-live', live);
        if (live) game.frame(now);
      }
    },
    abandon() {
      for (const game of cards) if (game.running()) game.finish(performance.now());
    },
  };
}
