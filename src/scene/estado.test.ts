import { describe, expect, it } from 'vitest';
import { CAPACIDAD_CABINA } from '../data/modelos.ts';
import { estadoDePrueba, estadoDePruebaConParametros } from './estado.ts';
import { PISO_MAXIMO } from './medidas.ts';

describe('estado fijo de prueba', () => {
  it('tiene una fila por piso, de S a P9, y la cabina no pasa de su capacidad', () => {
    const e = estadoDePrueba();
    expect(e.filas).toHaveLength(PISO_MAXIMO + 1);
    expect(e.cabina.ocupantes.length).toBeLessThanOrEqual(CAPACIDAD_CABINA);
  });

  it('nadie está en dos lugares a la vez', () => {
    const e = estadoDePrueba();
    const ids = [...e.cabina.ocupantes, ...e.filas.flat()].map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('empieza con la cabina en P1 y las puertas abiertas, con gente esperando en P1', () => {
    const e = estadoDePrueba();
    expect(e.cabina.piso).toBe(1);
    expect(e.cabina.puertas).toBe(1);
    expect(e.filas[1].length).toBeGreaterThan(0);
  });
});

describe('parámetros de prueba (solo desarrollo)', () => {
  it('sin parámetros devuelve el estado fijo', () => {
    expect(estadoDePruebaConParametros('')).toEqual(estadoDePrueba());
  });

  it('cambia el piso de la cabina, las puertas y los ocupantes', () => {
    const e = estadoDePruebaConParametros('?cabina=4.5&puertas=0.5&ocupantes=7');
    expect(e.cabina.piso).toBe(4.5);
    expect(e.cabina.puertas).toBe(0.5);
    expect(e.cabina.ocupantes).toHaveLength(7);
  });

  it('limita los valores absurdos y descarta los que no son números', () => {
    const e = estadoDePruebaConParametros('?cabina=99&puertas=-3&ocupantes=500');
    expect(e.cabina.piso).toBe(PISO_MAXIMO);
    expect(e.cabina.puertas).toBe(0);
    expect(e.cabina.ocupantes).toHaveLength(CAPACIDAD_CABINA);
    expect(estadoDePruebaConParametros('?cabina=abc&puertas=').cabina).toEqual(estadoDePrueba().cabina);
  });
});
