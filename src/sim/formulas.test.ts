import { describe, expect, it } from 'vitest';
import { mm1k } from './formulas.ts';

describe('M/M/1/K', () => {
  it('ρ = 1 con K = 11: P0 = 1/12 y L = 5,5', () => {
    const r = mm1k(2, 2, 11);
    expect(r.p0).toBeCloseTo(1 / 12, 12);
    expect(r.L).toBeCloseTo(5.5, 12);
    expect(r.pK).toBeCloseTo(1 / 12, 12);
    expect(r.Lq).toBeCloseTo(5.5 - (1 - 1 / 12), 12);
  });

  it('caso hecho a mano: ρ = 0,5 y K = 2', () => {
    const r = mm1k(1, 2, 2);
    expect(r.p0).toBeCloseTo(0.5 / 0.875, 12); // 4/7
    expect(r.pn[1]).toBeCloseTo(2 / 7, 12);
    expect(r.pK).toBeCloseTo(1 / 7, 12);
    expect(r.L).toBeCloseTo(4 / 7, 12);
    expect(r.Lq).toBeCloseTo(1 / 7, 12);
    expect(r.lambdaEf).toBeCloseTo(1 * (6 / 7), 12);
    expect(r.W).toBeCloseTo(4 / 7, 12); // L/λ con λ = 1
    expect(r.WEf).toBeCloseTo(4 / 7 / (6 / 7), 12);
  });

  it('ρ > 1 también funciona: ρ = 2 y K = 2', () => {
    const r = mm1k(2, 1, 2);
    expect(r.p0).toBeCloseTo(1 / 7, 12);
    expect(r.pK).toBeCloseTo(4 / 7, 12);
    expect(r.L).toBeCloseTo(10 / 7, 12);
  });

  it('ρ = 0,9 con K = 11 da ≈ 4,4 % y Lq ≈ 3,4 (referencias del PDF)', () => {
    const r = mm1k(3.6, 4, 11);
    expect(r.pK * 100).toBeCloseTo(4.4, 1);
    expect(r.Lq).toBeCloseTo(3.4, 1);
  });

  it('las probabilidades suman 1', () => {
    for (const [l, m] of [[0.3, 3.9], [3.7, 3.9], [5, 3.9], [4, 4]]) {
      expect(mm1k(l, m, 11).pn.reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
    }
  });

  it('λ = 0: nadie llega', () => {
    const r = mm1k(0, 3.9, 11);
    expect(r.L).toBe(0);
    expect(r.pK).toBe(0);
    expect(r.W).toBe(0);
  });

  it('rechaza valores inválidos', () => {
    expect(() => mm1k(-1, 2, 11)).toThrow(RangeError);
    expect(() => mm1k(1, 0, 11)).toThrow(RangeError);
    expect(() => mm1k(1, 2, 0)).toThrow(RangeError);
    expect(() => mm1k(Number.NaN, 2, 11)).toThrow(RangeError);
  });
});
