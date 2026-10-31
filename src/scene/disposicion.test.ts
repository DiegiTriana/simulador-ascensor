import { describe, expect, it } from 'vitest';
import { MITAD_INTERIOR_CABINA, desvio, lugarEnCabina, lugarEnFila } from './disposicion.ts';
import { TORRE } from './medidas.ts';

const distancia = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

describe('lugares en la fila', () => {
  const lugares = Array.from({ length: 12 }, (_, i) => lugarEnFila(i, 100 + i));

  it('nadie se superpone con otra persona', () => {
    for (let i = 0; i < lugares.length; i++) {
      for (let j = i + 1; j < lugares.length; j++) {
        expect(distancia(lugares[i], lugares[j])).toBeGreaterThan(0.8);
      }
    }
  });

  it('las cuatro primeras hileras quedan en el vestíbulo, frente a la puerta y a lo ancho de la torre', () => {
    for (const l of lugares) {
      expect(l.x).toBeGreaterThan(TORRE.x0);
      expect(l.x).toBeLessThan(TORRE.xPuertas - 0.4);
      expect(l.z).toBeGreaterThan(TORRE.z0 + 0.5);
      expect(l.z).toBeLessThan(TORRE.z1 - 0.5);
    }
  });

  it('el primero de la fila es el más cercano a la puerta y mira hacia ella (+x)', () => {
    expect(lugares[0].x).toBeGreaterThan(lugares[3].x);
    for (const l of lugares) expect(Math.cos(l.giro - Math.PI / 2)).toBeGreaterThan(0.95);
  });

  it('el desvío es el mismo para la misma persona y no usa azar', () => {
    expect(lugarEnFila(4, 77)).toEqual(lugarEnFila(4, 77));
    for (let id = 0; id < 200; id++) {
      const d = desvio(id);
      expect(d).toBeGreaterThanOrEqual(-0.5);
      expect(d).toBeLessThan(0.5);
    }
  });
});

describe('lugares en la cabina', () => {
  const lugares = Array.from({ length: 12 }, (_, i) => lugarEnCabina(i));

  it('hay 12 lugares distintos (4 hileras de 3), más que la capacidad de 10', () => {
    const claves = new Set(lugares.map((l) => `${l.x.toFixed(3)},${l.z.toFixed(3)}`));
    expect(claves.size).toBe(12);
  });

  it('todos quedan dentro de la cabina, a más de 0,4 de las paredes', () => {
    for (const l of lugares) {
      expect(Math.abs(l.x)).toBeLessThanOrEqual(MITAD_INTERIOR_CABINA.x - 0.4);
      expect(Math.abs(l.z)).toBeLessThanOrEqual(MITAD_INTERIOR_CABINA.z - 0.4);
    }
  });

  it('se llena desde el fondo hacia la puerta y todos miran a la puerta (−x)', () => {
    expect(lugares[0].x).toBeGreaterThan(lugares[11].x);
    expect(lugares[0].x).toBeGreaterThan(0);
    for (const l of lugares) expect(Math.cos(l.giro + Math.PI / 2)).toBeGreaterThan(0.99);
  });

  it('no deja que se pidan más de 12 lugares', () => {
    expect(() => lugarEnCabina(12)).toThrow(RangeError);
  });
});
