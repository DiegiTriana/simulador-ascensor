import { describe, expect, it } from 'vitest';
import { CAPACIDAD_CABINA } from '../data/modelos.ts';
import { MAX_POR_PISO } from './corrida.ts';
import { estadoDePrueba, estadoDePruebaConParametros } from './estado.ts';
import { textoDeExtras } from './ColasExtra.tsx';
import { aVista } from './vista.ts';
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

describe('la escena de muestra', () => {
  it('trae una silla de ruedas y alguien con muletas, para ver cómo se ven', () => {
    const e = estadoDePrueba();
    const tipos = new Set([...e.cabina.ocupantes, ...e.filas.flat()].map((p) => p.tipo));
    for (const t of ['normal', 'silla', 'muletas'] as const) expect(tipos.has(t)).toBe(true);
  });

  it('con una fila larga solo dibuja las primeras y dice cuántas faltan', () => {
    const v = aVista(estadoDePruebaConParametros('?fila=20'));
    expect(v.extras[1]).toBe(20 - MAX_POR_PISO);
    expect(v.personas.filter((p) => p.x < 3.7 && p.y === 0).length).toBeLessThanOrEqual(MAX_POR_PISO);
    expect(aVista(estadoDePrueba()).extras.every((n) => n === 0)).toBe(true);
  });

  it('el rótulo dice «+1 persona» o «+N personas»', () => {
    expect(textoDeExtras(1)).toBe('+1 persona');
    expect(textoDeExtras(8)).toBe('+8 personas');
  });
});
