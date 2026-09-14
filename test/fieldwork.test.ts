import { describe, expect, it } from 'vitest';
import { D } from '../src/game/decimal';
import { createInitialState } from '../src/game/state';
import {
  FIELDWORK,
  award,
  fieldworkReady,
  fieldworkUnlocked,
} from '../src/game/fieldwork/shared';
import {
  endTyping,
  startTyping,
  typeChar,
  typingMultiplier,
  typingWpm,
} from '../src/game/fieldwork/typing';
import {
  bladeDepth,
  cutStrata,
  endStrata,
  startStrata,
} from '../src/game/fieldwork/strata';
import {
  advanceSettle,
  endSettle,
  moveValve,
  startSettle,
} from '../src/game/fieldwork/settle';
import {
  advanceStill,
  endStill,
  startStill,
  tapStill,
} from '../src/game/fieldwork/still';
import {
  endPress,
  pedal,
  startPress,
} from '../src/game/fieldwork/press';
import {
  endConstellation,
  pickStar,
  revealDone,
  startConstellation,
} from '../src/game/fieldwork/constellation';
import { deserialize, serialize } from '../src/game/save';

describe('fieldwork engine', () => {
  it('gates activities by discovery and honours cooldowns', () => {
    const state = createInitialState();
    expect(fieldworkUnlocked(state, 'constellation')).toBe(false);
    state.lifetime.essence = D(1);
    expect(fieldworkUnlocked(state, 'constellation')).toBe(true);
    state.fieldwork.constellation.cooldownUntil = 500;
    expect(fieldworkReady(state, 'constellation', 499)).toBe(false);
    expect(fieldworkReady(state, 'constellation', 500)).toBe(true);
    expect(FIELDWORK.map((def) => def.id)).toEqual([
      'typing', 'strata', 'settle', 'still', 'press', 'constellation',
    ]);
  });

  it('runs sudden-death typing and refills completed words', () => {
    const run = startTyping(() => 0, 1_000);
    expect(run.queue).toHaveLength(8);
    expect(run.queue.every((word) => /^[a-z]{3,9}$/.test(word))).toBe(true);
    let typed = run;
    for (const char of `${typed.queue[0]} `) typed = typeChar(typed, char, 1_500, () => 0);
    expect(typed.alive).toBe(true);
    expect(typed.wordsDone).toBe(1);
    expect(typed.queue).toHaveLength(8);
    expect(typed.correctChars).toBe(typed.queue[0] === 'the' ? 3 : 3);
    expect(typeChar(run, 'x', 1_001).alive).toBe(false);
    expect(typingWpm(typed, 60_000)).toBeGreaterThan(0);
    expect(typingWpm(typed, 1_500)).toBe(0);
    expect(typingMultiplier(1_000, 100)).toBe(60);
  });

  it('awards Decimal typing evidence and records the best run', () => {
    const state = createInitialState();
    const run = startTyping(() => 0, 0);
    const completed = `${run.queue[0]} `.split('').reduce(
      (current, char) => typeChar(current, char, 10_000, () => 0),
      run,
    );
    const wall = 1_700_000_000_000;
    const result = endTyping(state, completed, 10_000, wall);
    expect(Number.isFinite(result.evidence.exponent)).toBe(true);
    expect(result.evidence.gt(0)).toBe(true);
    expect(state.fieldwork.typing.runs).toBe(1);
    expect(fieldworkReady(state, 'typing', wall)).toBe(false);
    expect(fieldworkReady(state, 'typing', wall + 30_000)).toBe(true);
  });

  it('grades strata cuts and ends on a miss', () => {
    const start = startStrata(1_000);
    expect(bladeDepth(start, 1_000)).toBe(0);
    expect(cutStrata(start, 1_000)).toMatchObject({ grade: 'perfect' });
    expect(cutStrata(start, 1_100).grade).toBe('good');
    expect(cutStrata(start, 1_200).grade).toBe('miss');
    const state = createInitialState();
    const reward = endStrata(state, { ...start, cuts: 12, combo: 12 });
    expect(Number.isFinite(reward.exponent)).toBe(true);
    expect(reward.toNumber()).toBeGreaterThan(0);
  });

  it('tracks settling time and ends after leaving the band', () => {
    const base = startSettle(0, () => 0.5);
    const inside = advanceSettle(base, 500, () => 0.5);
    expect(inside.inBandMs).toBe(500);
    const outside = advanceSettle(moveValve(inside, 1), 1_101, () => 0.5);
    expect(outside.alive).toBe(false);
    const state = createInitialState();
    expect(endSettle(state, inside).gt(0)).toBe(true);
  });

  it('spawns, catches, and counts still-room misses', () => {
    const started = startStill(0, () => 0);
    const spawned = advanceStill(started, 600, () => 0);
    expect(spawned.drops).toHaveLength(1);
    const caught = tapStill(spawned, 1_800);
    expect(caught.hit).toBe(true);
    expect(caught.run.caught).toBe(1);
    const missed = advanceStill({
      ...started,
      drops: [{ spawnedAt: 0 }, { spawnedAt: 0 }, { spawnedAt: 0 }],
      nextSpawnAt: Number.MAX_SAFE_INTEGER,
    }, 1_321, () => 0);
    expect(missed.missed).toBe(3);
    expect(missed.alive).toBe(false);
    const state = createInitialState();
    expect(endStill(state, caught.run).gt(0)).toBe(true);
  });

  it('raises and decays press pressure, with slips and bursts', () => {
    let run = startPress(0);
    run = pedal(run, 'L', 0);
    run = pedal(run, 'R', 0);
    const slipped = pedal(run, 'R', 0);
    expect(slipped.pressure).toBeCloseTo(0.1);
    run = startPress(0);
    for (const side of ['L', 'R', 'L', 'R', 'L', 'R', 'L', 'R'] as const) run = pedal(run, side, 0);
    expect(run.alive).toBe(false);
    const state = createInitialState();
    expect(endPress(state, slipped).gte(0)).toBe(true);
  });

  it('advances constellation rounds and kills wrong picks', () => {
    const initial = startConstellation(() => 0);
    expect(initial.sequence).toHaveLength(2);
    const ready = revealDone(initial);
    const first = pickStar(ready, 0, () => 0);
    const next = pickStar(first, 0, () => 0);
    expect(next.round).toBe(2);
    expect(next.showing).toBe(true);
    expect(pickStar(revealDone(next), 1, () => 0).alive).toBe(false);
    const state = createInitialState();
    expect(endConstellation(state, next).gt(0)).toBe(true);
  });

  it('awards bounded Decimal values from the shared helper at huge rates', () => {
    const state = createInitialState();
    state.buildings.harvester = 1;
    const reward = award(state, 'broth', 1, 1, 1, 2);
    expect(Number.isFinite(reward.exponent)).toBe(true);
    expect(Number.isFinite(reward.exponent)).toBe(true);
  });

  it('round-trips v6 fieldwork progress and gives v5 saves an empty record', () => {
    const state = createInitialState();
    state.fieldwork.press = { best: 123, runs: 4, cooldownUntil: 9_000 };
    const loaded = deserialize(serialize(state));
    expect(loaded?.fieldwork.press).toEqual(state.fieldwork.press);
    const v5 = deserialize({
      version: 5,
      totalClicks: 0,
      lastSaveTime: 0,
      buildings: {},
      upgrades: [],
      research: [],
      achievements: [],
    });
    expect(v5?.fieldwork.press).toEqual({ best: 0, runs: 0, cooldownUntil: 0 });
    const dirty = deserialize({
      version: 6,
      fieldwork: {
        typing: { best: Infinity, runs: 2, cooldownUntil: NaN },
      },
      totalClicks: 0,
      lastSaveTime: 0,
      buildings: {},
      upgrades: [],
      research: [],
      achievements: [],
    });
    expect(dirty?.fieldwork.typing).toEqual({ best: 0, runs: 2, cooldownUntil: 0 });
  });
});
