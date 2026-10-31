import { describe, expect, it } from 'vitest';
import { CELDAS_CABINA, MITAD_INTERIOR_CABINA, asignarCeldas, desvio, lugarEnCabina, lugarEnFila, puntoDeCeldas } from './disposicion.ts';
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

describe('cupos en la cabina: normales, muletas y silla de ruedas', () => {
  const vacias = () => Array.from({ length: 12 }, () => 0);
  const marcar = (usadas: number[], celdas: number[]) => celdas.forEach((i) => usadas[i]++);

  it('una persona normal ocupa una celda y se llenan del fondo hacia la puerta', () => {
    const usadas = vacias();
    const vistas = new Set<number>();
    for (let i = 0; i < 12; i++) {
      const celdas = asignarCeldas(usadas, 1);
      expect(celdas).toHaveLength(1);
      expect(vistas.has(celdas[0])).toBe(false);
      vistas.add(celdas[0]);
      marcar(usadas, celdas);
    }
    expect(vistas.size).toBe(12);
    expect(CELDAS_CABINA[0].x).toBeGreaterThan(CELDAS_CABINA[11].x);
  });

  it('unas muletas ocupan dos celdas juntas de una hilera y se paran entre las dos', () => {
    const celdas = asignarCeldas(vacias(), 2);
    expect(celdas).toHaveLength(2);
    expect(CELDAS_CABINA[celdas[0]].fila).toBe(CELDAS_CABINA[celdas[1]].fila);
    expect(Math.abs(CELDAS_CABINA[celdas[0]].columna - CELDAS_CABINA[celdas[1]].columna)).toBe(1);
    const punto = puntoDeCeldas(celdas);
    expect(punto.z).toBeCloseTo((CELDAS_CABINA[celdas[0]].z + CELDAS_CABINA[celdas[1]].z) / 2, 9);
  });

  it('una silla de ruedas ocupa una hilera entera y queda en el centro', () => {
    const celdas = asignarCeldas(vacias(), 3);
    expect(celdas).toHaveLength(3);
    expect(new Set(celdas.map((i) => CELDAS_CABINA[i].fila)).size).toBe(1);
    expect(puntoDeCeldas(celdas).z).toBeCloseTo(0, 9);
  });

  it('busca una hilera libre aunque las primeras tengan gente', () => {
    const usadas = vacias();
    marcar(usadas, [0, 3]); // una persona en cada una de las dos primeras hileras
    const silla = asignarCeldas(usadas, 3);
    expect(CELDAS_CABINA[silla[0]].fila).toBe(2);
    // Con alguien parado en el centro de las dos primeras hileras, las muletas (dos celdas juntas) van a la tercera.
    const muletas = asignarCeldas(usadas, 2);
    expect(CELDAS_CABINA[muletas[0]].fila).toBe(2);
    expect(muletas.every((i) => usadas[i] === 0)).toBe(true);
    // Si la persona está al lado y no en el centro, todavía queda un par libre en esa hilera.
    const al_lado = vacias();
    marcar(al_lado, [1]); // columna izquierda de la primera hilera
    const otras = asignarCeldas(al_lado, 2);
    expect(CELDAS_CABINA[otras[0]].fila).toBe(0);
    expect(otras.every((i) => al_lado[i] === 0)).toBe(true);
  });

  it('con una persona en cada hilera no hay dónde poner una silla: usa la hilera menos ocupada, encimada', () => {
    const usadas = vacias();
    marcar(usadas, [0, 3, 6, 9]);
    expect(asignarCeldas(usadas, 3)).toHaveLength(3);
  });

  it('todo lo que se asigna queda dentro de la cabina, con lugar para la silla y las muletas', () => {
    for (const cupos of [1, 2, 3]) {
      const celdas = asignarCeldas(vacias(), cupos);
      const p = puntoDeCeldas(celdas);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(MITAD_INTERIOR_CABINA.x - 0.4);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(MITAD_INTERIOR_CABINA.z - 0.4);
    }
  });
});
