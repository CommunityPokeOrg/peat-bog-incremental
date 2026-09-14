import type { Decimal } from '../decimal';
import { WORDS } from '../../data/words';
import type { GameState } from '../state';
import { award, fieldworkDef } from './shared';

export interface TypingRun {
  queue: string[];
  typed: string;
  startedAt: number;
  correctChars: number;
  wordsDone: number;
  alive: boolean;
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
    correctChars: 0,
    wordsDone: 0,
    alive: true,
  };
}

export function typeChar(
  run: TypingRun,
  char: string,
  _now: number,
  rng = Math.random,
): TypingRun {
  if (!run.alive || !run.queue[0]) return run;
  const word = run.queue[0];
  if (char === ' ' || char === 'Enter') {
    if (run.typed !== word) return { ...run, alive: false };
    const queue = refill(run.queue.slice(1), rng);
    return { ...run, queue, typed: '', correctChars: run.correctChars + word.length, wordsDone: run.wordsDone + 1 };
  }
  if (char.length !== 1 || char !== word[run.typed.length]) return { ...run, alive: false };
  return { ...run, typed: run.typed + char };
}

export function typingWpm(run: TypingRun, now: number): number {
  const elapsed = now - run.startedAt;
  if (elapsed < 1_000) return 0;
  return run.correctChars / 5 / (elapsed / 60_000);
}

export function typingMultiplier(wpm: number, wordsDone: number): number {
  const speed = Number.isFinite(wpm) ? Math.max(0, wpm) : 0;
  const streak = Number.isFinite(wordsDone) ? Math.max(0, wordsDone) : 0;
  return Math.min(60, (1 + speed / 40) * 1.12 ** streak);
}

export function endTyping(
  state: GameState,
  run: TypingRun,
  now: number,
  wall = Date.now(),
): { evidence: Decimal; wpm: number; words: number } {
  const wpm = typingWpm(run, now);
  const evidence = award(state, 'evidence', run.wordsDone * 2, 1, typingMultiplier(wpm, run.wordsDone), 60, run.wordsDone > 0);
  const progress = state.fieldwork.typing;
  progress.best = Math.max(progress.best, wpm);
  progress.runs += 1;
  progress.cooldownUntil = wall + fieldworkDef('typing').cooldownMs;
  return { evidence, wpm, words: run.wordsDone };
}
