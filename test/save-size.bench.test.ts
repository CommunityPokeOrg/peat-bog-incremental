import { describe, expect, it } from 'vitest';
import { CHARTER } from '../src/game/charter';
import { BUILDINGS, UPGRADES } from '../src/game/data';
import { D } from '../src/game/decimal';
import { ALL_QUESTS } from '../src/game/quests';
import { serialize } from '../src/game/save';
import { createInitialState } from '../src/game/state';

function base64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function bitset(length: number): string {
  const bits = new Uint32Array(Math.ceil(length / 32));
  bits.fill(0xffffffff);
  return base64(new Uint8Array(bits.buffer));
}

function packedSave(): string {
  const state = createInitialState();
  const counts = new Uint16Array(BUILDINGS.length);
  counts.fill(500);
  const decimals = [
    ...Object.values(state.wallet).map(() => D('1e300')),
    ...Object.values(state.lifetime).map(() => D('1e300')),
    D('1e300'),
  ];
  const mantissa = new Float64Array(decimals.map((value) => value.mantissa));
  const exponent = new Int32Array(decimals.map((value) => value.exponent));
  return JSON.stringify({
    version: 5,
    buildings: base64(new Uint8Array(counts.buffer)),
    upgrades: bitset(UPGRADES.length),
    charter: bitset(CHARTER.length),
    claimed: bitset(ALL_QUESTS.length),
    decimals: {
      mantissa: base64(new Uint8Array(mantissa.buffer)),
      exponent: base64(new Uint8Array(exponent.buffer)),
    },
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function measure(value: string): { bytes: number; microseconds: number } {
  const bytes = new TextEncoder().encode(value).byteLength;
  const samples: number[] = [];
  for (let index = 0; index < 50; index += 1) {
    const start = performance.now();
    const parsed = JSON.parse(value);
    JSON.stringify(parsed);
    samples.push((performance.now() - start) * 1_000);
  }
  return { bytes, microseconds: median(samples) };
}

describe('save representation benchmark', () => {
  it('reports current and packed late-game save size and JSON cost', () => {
    const state = createInitialState();
    for (const building of BUILDINGS) state.buildings[building.id] = 500;
    state.upgrades = UPGRADES.map((upgrade) => upgrade.id);
    state.charter = CHARTER.map((node) => node.id);
    state.quests.claimed = ALL_QUESTS.map((quest) => quest.id);
    for (const resource of Object.keys(state.wallet)) {
      state.wallet[resource as keyof typeof state.wallet] = D('1e300');
    }
    for (const resource of Object.keys(state.lifetime)) {
      state.lifetime[resource as keyof typeof state.lifetime] = D('1e300');
    }
    state.runCompute = D('1e300');
    const current = measure(serialize(state));
    const packed = measure(packedSave());
    console.info(JSON.stringify({
      currentBytes: current.bytes,
      currentJsonMicroseconds: current.microseconds,
      packedBytes: packed.bytes,
      packedJsonMicroseconds: packed.microseconds,
    }));
    expect(current.bytes).toBeGreaterThan(0);
    expect(packed.bytes).toBeGreaterThan(0);
  });
});
