import { FIELDWORK, fieldworkReady, fieldworkUnlocked, type FieldworkId } from '../game/fieldwork/shared';
import { endTyping, expireTyping, startTyping, typeChar, typingMultiplier, typingWpm, wordClockMs, type TypingRun } from '../game/fieldwork/typing';
import { advanceStrata, bladeDepth, cutStrata, endStrata, startStrata, type StrataRun } from '../game/fieldwork/strata';
import { advanceSettle, endSettle, moveValve, startSettle, type SettleRun } from '../game/fieldwork/settle';
import { advanceStill, dropFallMs, endStill, setHeat, startStill, tapStill, type StillRun } from '../game/fieldwork/still';
import { advancePress, endPress, pedal, quench, startPress, type PressRun } from '../game/fieldwork/press';
import {
  CONSTELLATION_STARS,
  endConstellation,
  expireConstellation,
  pickStar,
  revealDone,
  revealMs,
  startConstellation,
  type ConstellationRun,
} from '../game/fieldwork/constellation';
import { RESOURCES } from '../game/data';
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
  typing: 'Type the words as they come; every fifth word is gold and each word has its own shrinking clock.',
  strata: 'Cut peat on the blade line, skip roots for combo, and never let a peat beat pass uncut.',
  settle: 'Keep the valve inside the drifting band; it narrows over time and gusts jump it after a warning.',
  still: 'Choose heat to speed the drops; sour drops punish a catch, while missed ordinary drops cool the still.',
  press: 'Pump alternately to hold pressure; bricks complete every four seconds and Space quenches once per brick.',
  constellation: 'Watch the stars light, then trace them before the round clock expires; each round reveals one more star.',
};

const RESOURCE_LABEL: Record<FieldworkId, string> = {
  typing: 'case evidence',
  strata: 'discovery dumps',
  settle: 'dark-pool flow',
  still: 'certified tokens',
  press: 'exhibit bundles',
  constellation: 'alpha essence',
};

const GAME_GLYPH: Record<FieldworkId, string> = {
  typing: '📜',
  strata: '🪓',
  settle: '🪣',
  still: '⚗️',
  press: '🧱',
  constellation: '✨',
};

function resourceName(id: string): string {
  return RESOURCES.find((resource) => resource.id === id)?.name ?? id;
}

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
  const root = el('div', 'fw-root');
  const hub = el('section', 'fw-hub');
  const hubTitle = el('h2', undefined, 'Fieldwork');
  const sites = el('ul', 'fw-sites');
  sites.setAttribute('role', 'list');
  hub.append(hubTitle, sites);
  const play = el('section', 'fw-play');
  play.hidden = true;
  const playBar = el('div', 'fw-play-bar');
  const back = el('button', 'btn fw-back', '← Fieldwork');
  back.type = 'button';
  const playTitle = el('h2', 'fw-play-title');
  playBar.append(back, playTitle);
  const playCardHost = el('div', 'fw-card-host');
  play.append(playBar, playCardHost);
  root.append(hub, play);
  container.replaceChildren(root);
  const cards: GameCard[] = [];
  let selected: FieldworkId | null = null;
  let returnFocus: HTMLButtonElement | null = null;

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
    stage.appendChild(el('div', 'fw-clock'));
    card.appendChild(stage);
    const row = el('div', 'fw-controls');
    const start = el('button', 'btn fw-start', 'Start');
    start.type = 'button';
    row.appendChild(start);
    const live = el('div', 'fieldwork-live');
    live.setAttribute('aria-live', 'polite');
    row.appendChild(live);
    card.appendChild(row);
    card.hidden = true;
    playCardHost.appendChild(card);
    return { card, live, start, stage };
  }

  function report(game: GameCard, amount: Decimal | undefined, summary: string): void {
    if (!amount) return;
    game.live.textContent = `${summary} +${formatNumber(amount)} ${RESOURCE_LABEL[game.id]}.`;
    onAward(amount, FIELDWORK.find((def) => def.id === game.id)!.resource);
  }

  function open(id: FieldworkId, source?: HTMLButtonElement): void {
    selected = id;
    returnFocus = source ?? sites.querySelector<HTMLButtonElement>(`.fw-site[data-game="${id}"]`);
    const game = cards.find((candidate) => candidate.id === id);
    if (!game) return;
    hub.hidden = true;
    play.hidden = false;
    play.dataset.game = id;
    playTitle.textContent = FIELDWORK.find((def) => def.id === id)?.name ?? id;
    for (const card of cards) card.card.hidden = card.id !== id;
    game.card.focus({ preventScroll: true });
  }

  function backToHub(): void {
    if (selected) {
      const game = cards.find((candidate) => candidate.id === selected);
      if (game?.running()) game.finish(performance.now());
    }
    for (const game of cards) game.card.hidden = true;
    selected = null;
    play.hidden = true;
    hub.hidden = false;
    returnFocus?.focus({ preventScroll: true });
  }

  back.addEventListener('click', backToHub);
  play.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      backToHub();
    }
  });

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
          if (run!.gold) span.classList.add('is-gold');
          const done = el('b', undefined, word.slice(0, run!.typed.length));
          span.append(done, word.slice(run!.typed.length));
        } else {
          span.textContent = word;
        }
        return span;
      }));
      const wpm = typingWpm(run, now);
      const clock = stage.querySelector<HTMLElement>('.fw-clock');
      clock?.style.setProperty('--t', String(Math.max(0, run.deadline - now) / wordClockMs(run.wordsDone)));
      meter.textContent = `${Math.round(wpm)} wpm · ${run.wordsDone} words · streak ${run.streak} · ×${typingMultiplier(wpm, run.streak).toFixed(2)}`;
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
      frame(now) {
        if (!run) return;
        run = expireTyping(run, now);
        if (!run.alive) {
          live.textContent = 'The word clock ran out.';
          game.finish(now);
          return;
        }
        paint(now);
      },
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
    const strataEls = Array.from({ length: 5 }, () => {
      const stratum = el('span', 'fw-stratum');
      face.appendChild(stratum);
      return stratum;
    });
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
        run = startStrata(now, rng);
        cut.disabled = false;
        cut.focus();
        live.textContent = 'Files dropping — cut on each line.';
      },
      frame(now) {
        if (!run) return;
        run = advanceStrata(run, now);
        strataEls.forEach((stratum, index) => {
          stratum.dataset.layer = run!.layers[index];
        });
        face.style.setProperty('--depth', String(bladeDepth(run, now)));
        combo.textContent = `${run.cuts} cuts · combo ${run.combo}`;
        stage.querySelector<HTMLElement>('.fw-clock')?.style.setProperty(
          '--t',
          String(1 - (Math.max(0, now - run.startedAt) % run.beatMs) / run.beatMs),
        );
        if (!run.alive) {
          live.textContent = 'A peat beat passed — the face collapsed.';
          game.finish(now);
        }
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
        live.textContent = 'Off the beat — the stack collapsed.';
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
    slider.setAttribute('aria-label', 'Flow valve');
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
        tank.dataset.gust = now >= run.gustAt - 700 && now < run.gustAt ? 'soon' : '';
        stage.querySelector<HTMLElement>('.fw-clock')?.style.setProperty(
          '--t',
          String(Math.max(0, run.gustAt - now) / 9_000),
        );
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
    const heatPicker = el('fieldset', 'fw-heat-picker');
    heatPicker.appendChild(el('legend', undefined, 'Heat'));
    const heatInputs: HTMLInputElement[] = [];
    for (const heat of [1, 2, 3] as const) {
      const label = el('label', 'fw-heat-label');
      const input = el('input', 'fw-heat') as HTMLInputElement;
      input.type = 'radio';
      input.name = 'still-heat';
      input.value = String(heat);
      input.disabled = true;
      input.setAttribute('aria-label', `Heat ${heat}`);
      if (heat === 1) input.checked = true;
      heatInputs.push(input);
      label.append(input, document.createTextNode(` ${heat}`));
      heatPicker.appendChild(label);
    }
    const column = el('div', 'fw-column');
    const line = el('span', 'fw-catchline');
    column.appendChild(line);
    const tap = el('button', 'fieldwork-btn fw-action', 'Catch');
    tap.type = 'button';
    tap.disabled = true;
    const meter = el('div', 'fw-meter');
    stage.append(heatPicker, column, tap, meter);
    let run: StillRun | null = null;
    const dropEls = new Map<number, HTMLElement>();

    const game: GameCard = {
      id: 'still', card, live, start, stage,
      running: () => run !== null && run.alive,
      begin(now) {
        run = startStill(now, rng);
        heatInputs[0].checked = true;
        heatInputs.forEach((input) => { input.disabled = false; });
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
          node.dataset.sour = String(drop.sour);
          node.style.setProperty('--p', String(Math.min(1.15, (now - drop.spawnedAt) / dropFallMs(run))));
        }
        meter.textContent = `${run.caught} caught · ${run.missed}/3 missed`;
        stage.querySelector<HTMLElement>('.fw-clock')?.style.setProperty(
          '--t',
          String(Math.max(0, dropFallMs(run) - ((now - (run.drops[0]?.spawnedAt ?? now)) % dropFallMs(run))) / dropFallMs(run)),
        );
        if (!run.alive) {
          live.textContent = 'The mint went cold.';
          game.finish(now);
        }
      },
      finish() {
        if (!run) return undefined;
        const ended = run;
        run = null;
        tap.disabled = true;
        heatInputs.forEach((input) => { input.disabled = true; });
        for (const node of dropEls.values()) node.remove();
        dropEls.clear();
        const broth = mutate((state) => endStill(state, ended));
        report(game, broth, `${ended.caught} drips caught.`);
        return broth;
      },
    };
    heatInputs.forEach((input) => input.addEventListener('change', () => {
      if (run?.alive && input.checked) setHeat(run, Number(input.value) as 1 | 2 | 3);
    }));
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
    const quenchButton = el('button', 'fieldwork-btn fw-action fw-quench', 'Quench (Space)');
    quenchButton.type = 'button';
    quenchButton.disabled = true;
    const bricks = el('div', 'fw-bricks');
    const meter = el('div', 'fw-meter');
    stage.append(gauge, pedals, quenchButton, bricks, meter);
    let run: PressRun | null = null;

    const game: GameCard = {
      id: 'press', card, live, start, stage,
      running: () => run !== null && run.alive,
      begin(now) {
        run = startPress(now);
        left.disabled = false;
        right.disabled = false;
        quenchButton.disabled = false;
        left.focus();
        live.textContent = 'Pump alternately — hold the green band.';
      },
      frame(now) {
        if (!run) return;
        if (run.alive) run = advancePress(run, now);
        gauge.style.setProperty('--pressure', String(run.pressure));
        gauge.setAttribute('aria-valuenow', String(Math.round(run.pressure * 100)));
        bricks.replaceChildren(...Array.from({ length: run.bricks }, () => el('span', undefined, '🧱')));
        meter.textContent = `${(run.compressedMs / 1000).toFixed(1)} s compressed · ${run.bricks} bricks`;
        stage.querySelector<HTMLElement>('.fw-clock')?.style.setProperty('--t', String((run.compressedMs % 4_000) / 4_000));
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
        quenchButton.disabled = true;
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
    quenchButton.addEventListener('click', () => {
      if (run?.alive) run = quench(run, performance.now());
    });
    card.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') { event.preventDefault(); doPedal('L'); }
      if (key === 'l' || key === 'arrowright') { event.preventDefault(); doPedal('R'); }
      if (key === ' ') { event.preventDefault(); if (run?.alive) run = quench(run, performance.now()); }
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
          if (run) {
            run = revealDone(run, performance.now());
            setStars(true);
            stars[0].focus();
            live.textContent = 'Your turn — trace the stars.';
          }
          return;
        }
        stars[sequence[index]].classList.add('is-lit');
        index += 1;
      }, revealMs(run.round));
    };

    const game: GameCard = {
      id: 'constellation', card, live, start, stage,
      running: () => run !== null && run.alive,
      begin() {
        run = startConstellation(rng);
        live.textContent = 'Watch the sky.';
        reveal();
      },
      frame(now) {
        if (!run) return;
        run = expireConstellation(run, now);
        meter.textContent = `round ${run.round} · ${run.sequence.length} stars`;
        stage.querySelector<HTMLElement>('.fw-clock')?.style.setProperty(
          '--t',
          run.showing ? '1' : String(Math.max(0, run.inputDeadline - now) / (1_500 * run.sequence.length)),
        );
        if (!run.alive) {
          live.textContent = 'The input clock ran out — the sky clouded.';
          game.finish(now);
        }
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

  const siteItems = new Map<FieldworkId, HTMLLIElement>();
  const siteButtons = new Map<FieldworkId, HTMLButtonElement>();
  for (const def of FIELDWORK) {
    const site = el('li', 'fw-site') as HTMLLIElement;
    const unlockedButton = el('button', 'fw-site') as HTMLButtonElement;
    unlockedButton.type = 'button';
    unlockedButton.dataset.game = def.id;
    const description = el('span', 'fw-site-description');
    description.id = `fw-site-${def.id}-description`;
    const eyebrow = el('span', 'fw-site-eyebrow', RESOURCE_LABEL[def.id]);
    const heading = el('strong', 'fw-site-name', def.name);
    const glyph = el('span', 'fw-site-glyph', GAME_GLYPH[def.id]);
    const best = el('span', 'fw-site-best');
    const status = el('span', 'fw-status');
    unlockedButton.setAttribute('aria-describedby', description.id);
    unlockedButton.append(eyebrow, heading, glyph, best, status, description);
    site.replaceChildren(unlockedButton);
    sites.appendChild(site);
    siteItems.set(def.id, site);
    siteButtons.set(def.id, unlockedButton);
    unlockedButton.addEventListener('click', () => open(def.id, unlockedButton));
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
        const stats = state.fieldwork[game.id];
        const siteItem = siteItems.get(game.id)!;
        if (!unlocked) {
          siteItem.classList.add('is-locked');
          siteItem.setAttribute('aria-disabled', 'true');
          siteItem.dataset.lockedGame = game.id;
          const text = el('span', 'fw-site-description', `Unlocks with ${resourceName(FIELDWORK.find((def) => def.id === game.id)!.unlock)}`);
          siteItem.replaceChildren(
            el('span', 'fw-site-eyebrow', RESOURCE_LABEL[game.id]),
            el('strong', 'fw-site-name', game.card.querySelector('h2')?.textContent ?? game.id),
            el('span', 'fw-site-glyph', GAME_GLYPH[game.id]),
            text,
          );
          game.card.hidden = true;
          continue;
        }
        if (siteItem.classList.contains('is-locked')) {
          siteItem.classList.remove('is-locked');
          siteItem.removeAttribute('aria-disabled');
          delete siteItem.dataset.lockedGame;
          const unlockedButton = el('button', 'fw-site') as HTMLButtonElement;
          unlockedButton.type = 'button';
          unlockedButton.dataset.game = game.id;
          const description = el('span', 'fw-site-description');
          description.id = `fw-site-${game.id}-description`;
          unlockedButton.setAttribute('aria-describedby', description.id);
          unlockedButton.append(
            el('span', 'fw-site-eyebrow', RESOURCE_LABEL[game.id]),
            el('strong', 'fw-site-name', game.card.querySelector('h2')?.textContent ?? game.id),
            el('span', 'fw-site-glyph', GAME_GLYPH[game.id]),
            el('span', 'fw-site-best'),
            el('span', 'fw-status'),
            description,
          );
          unlockedButton.addEventListener('click', () => open(game.id, unlockedButton));
          siteItem.replaceChildren(unlockedButton);
          siteButtons.set(game.id, unlockedButton);
        }
        const currentSite = siteButtons.get(game.id);
        if (!currentSite) continue;
        const best = game.card.querySelector<HTMLElement>('[data-role="best"]')!;
        best.textContent = stats.runs === 0 ? 'no runs yet' : `best ${Math.round(stats.best * 10) / 10}${game.id === 'typing' ? ' wpm' : ''} · ${stats.runs} runs`;
        const live = game.running();
        const ready = fieldworkReady(state, game.id, wall);
        game.start.textContent = live ? 'Stop' : ready ? 'Start' : `Ready in ${Math.ceil((stats.cooldownUntil - wall) / 1000)} s`;
        game.start.disabled = !live && !ready;
        game.card.classList.toggle('is-live', live);
        const siteBest = currentSite.querySelector<HTMLElement>('.fw-site-best')!;
        siteBest.textContent = best.textContent;
        const siteStatus = currentSite.querySelector<HTMLElement>('.fw-status')!;
        siteStatus.textContent = ready ? 'Ready' : `Ready in ${Math.max(1, Math.ceil((stats.cooldownUntil - wall) / 1000))} s`;
        currentSite.parentElement?.classList.toggle('is-ready', ready);
        if (selected === game.id && live) game.frame(now);
      }
      if (selected) {
        const game = cards.find((candidate) => candidate.id === selected);
        if (game) game.card.hidden = false;
      }
    },
    abandon() {
      for (const game of cards) if (game.running()) game.finish(performance.now());
      selected = null;
    },
  };
}
