// Varias corridas con semillas consecutivas y su promedio (la fase 2 las mueve a un Web Worker).

import { PARAMETROS as P } from '../data/parametros.ts';
import { mm1k, type ResultadoMM1K } from './formulas.ts';
import { CONFIG_DEFECTO, simularEntradas } from './simulacion.ts';
import type { OpcionesEscenario } from './llegadas.ts';
import { crearTraza, type Entradas, type Resultado, type Traza } from './tipos.ts';

export interface Estadistica {
  media: number;
  /** Desviación estándar entre corridas. */
  sd: number;
  n: number;
}

export function estadistica(xs: number[]): Estadistica | null {
  if (xs.length === 0) return null;
  const media = xs.reduce((s, x) => s + x, 0) / xs.length;
  const varianza = xs.length > 1 ? xs.reduce((s, x) => s + (x - media) ** 2, 0) / (xs.length - 1) : 0;
  return { media, sd: Math.sqrt(varianza), n: xs.length };
}

const validos = (xs: (number | null)[]): number[] => xs.filter((x): x is number => x !== null && Number.isFinite(x));

export interface Comparacion {
  corridas: Resultado[];
  /** Simulación (promedio de las corridas). */
  sim: Record<string, Estadistica | null>;
  /** M/M/1/K con λ = personas ÷ duración de toda la franja y μ medida. */
  formulasFranja: ResultadoMM1K | null;
  /** M/M/1/K con λ y μ medidas en los picos (como en el PDF). */
  formulasPico: ResultadoMM1K | null;
}

/** Semilla de la corrida número `i` (la 0 es la primera, la que se anima). */
export const semillaDeCorrida = (semillaBase: number, i: number): number => semillaBase + i;

export function correrVarias(
  entradas: Entradas,
  n = 10,
  semillaBase = 1,
  opciones: OpcionesEscenario = {},
): Resultado[] {
  return Array.from({ length: n }, (_, i) =>
    simularEntradas(entradas, semillaDeCorrida(semillaBase, i), CONFIG_DEFECTO, opciones),
  );
}

/**
 * La corrida que se anima: exactamente la primera de las que promedia la tabla (misma semilla derivada), con su
 * traza. Su `resultado` es igual, dato por dato, a `correrVarias(entradas, n, semillaBase)[0]`.
 */
export function corridaAnimada(
  entradas: Entradas,
  semillaBase = 1,
  opciones: OpcionesEscenario = {},
): { resultado: Resultado; traza: Traza } {
  const traza = crearTraza();
  const resultado = simularEntradas(entradas, semillaDeCorrida(semillaBase, 0), CONFIG_DEFECTO, opciones, traza);
  return { resultado, traza };
}

export function comparar(entradas: Entradas, corridas: Resultado[]): Comparacion {
  const col = (f: (r: Resultado) => number | null) => estadistica(validos(corridas.map(f)));
  const sim = {
    abandonoPct: col((r) => r.abandonoPct),
    abandonoPicoPct: col((r) => r.pico.abandonoPct),
    lambdaPicoPorMin: col((r) => r.pico.lambdaPorMin),
    muPorMin: col((r) => r.muPorMin),
    LqPico: col((r) => r.pico.Lq),
    LPico: col((r) => r.pico.L),
    Lq: col((r) => r.Lq),
    L: col((r) => r.L),
    WqSeg: col((r) => r.Wq),
    WSeg: col((r) => r.W),
    filaMaxima: col((r) => r.filaMaxima),
  };
  const mu = sim.muPorMin?.media;
  const lambdaFranja = entradas.llegadasP1 / entradas.duracionMin;
  const lambdaPico = sim.lambdaPicoPorMin?.media;
  return {
    corridas,
    sim,
    formulasFranja: mu ? mm1k(lambdaFranja, mu, P.K) : null,
    formulasPico: mu && lambdaPico ? mm1k(lambdaPico, mu, P.K) : null,
  };
}
