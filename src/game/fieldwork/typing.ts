import type { Decimal } from '../decimal';
import { WORDS } from '../../data/words';
import type { GameState } from '../state';
import { award, fieldworkDef } from './shared';

export interface TypingRun {
  queue: string[];
  typed: string;
  startedAt: number;
  deadline: number;
  correctChars: number;
  wordsDone: number;
  streak: number;
  gold: boolean;
  alive: boolean;
}

export function wordClockMs(wordsDone: number): number {
  return Math.max(3_000, 8_000 - 250 * Math.max(0, wordsDone));
}

function nextWord(rng: () => number): string {
  const raw = rng();
  const sample = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
  return WORDS[Math.min(WORDS.length - 1, Math.floor(sample ** 2 * WORDS.length))];
}

function refill(queue: string[], rng: () => number): string[] {
  const out = [...queue];
  while (out.length < 8) out.push(nextWord(rng));
  return out;
}

export function startTyping(rng = Math.random, now = Date.now()): TypingRun {
  return {
    queue: refill([], rng),
    typed: '',
    startedAt: now,
    deadline: now + wordClockMs(0),
    correctChars: 0,
    wordsDone: 0,
    streak: 0,
    gold: false,
    alive: true,
  };
}

export function typingExpired(run: TypingRun, now: number): boolean {
  return run.alive && now > run.deadline;
}

export function expireTyping(run: TypingRun, now: number): TypingRun {
  return typingExpired(run, now) ? { ...run, alive: false } : run;
}

export function typeChar(
  run: TypingRun,
  char: string,
  now: number,
  rng = Math.random,
): TypingRun {
  const current = expireTyping(run, now);
  if (!current.alive || !current.queue[0]) return current;
  const word = current.queue[0];
  if (char === ' ' || char === 'Enter') {
    if (current.typed !== word) return { ...current, alive: false };
    const wordsDone = current.wordsDone + 1;
    const queue = refill(current.queue.slice(1), rng);
    return {
      ...current,
      queue,
      typed: '',
      deadline: now + wordClockMs(wordsDone),
      correctChars: current.correctChars + word.length,
      wordsDone,
      streak: current.streak + (current.gold ? 2 : 1),
      gold: wordsDone % 5 === 4,
    };
  }
  if (char.length !== 1 || char !== word[current.typed.length]) return { ...current, alive: false };
  return { ...current, typed: current.typed + char };
}

export function typingWpm(run: TypingRun, now: number): number {
  const elapsed = now - run.startedAt;
  if (elapsed < 1_000) return 0;
  return run.correctChars / 5 / (elapsed / 60_000);
}

export function typingMultiplier(wpm: number, streak: number): number {
  const speed = Number.isFinite(wpm) ? Math.max(0, wpm) : 0;
  const weight = Number.isFinite(streak) ? Math.max(0, streak) : 0;
  return Math.min(60, (1 + speed / 40) * 1.12 ** weight);
}

export function endTyping(
  state: GameState,
  run: TypingRun,
  now: number,
  wall = Date.now(),
): { evidence: Decimal; wpm: number; words: number } {
  const wpm = typingWpm(run, now);
  const evidence = award(state, 'evidence', run.wordsDone * 2, 1, typingMultiplier(wpm, run.streak), 60, run.wordsDone > 0);
  const progress = state.fieldwork.typing;
  progress.best = Math.max(progress.best, wpm);
  progress.runs += 1;
  progress.cooldownUntil = wall + fieldworkDef('typing').cooldownMs;
  return { evidence, wpm, words: run.wordsDone };
}
