import { describe, expect, it } from 'vitest';
import { repartir } from './llegadas.ts';

describe('repartir', () => {
  it('suma exactamente el total y respeta las proporciones', () => {
    expect(repartir(92, [46, 46])).toEqual([46, 46]);
    expect(repartir(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(repartir(7, [15, 13, 11, 7]).reduce((s, x) => s + x, 0)).toBe(7);
    expect(repartir(5, [0, 0])).toEqual([0, 0]);
  });
});
