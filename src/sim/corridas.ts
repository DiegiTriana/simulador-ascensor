// Varias corridas con semillas consecutivas y su promedio (la fase 2 las mueve a un Web Worker).

import { PARAMETROS as P } from '../data/parametros.ts';
import { mm1k, type ResultadoMM1K } from './formulas.ts';
import { CONFIG_DEFECTO, simularEntradas } from './simulacion.ts';
import type { OpcionesEscenario } from './llegadas.ts';
import type { Entradas, Resultado } from './tipos.ts';

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

export function correrVarias(
  entradas: Entradas,
  n = 10,
  semillaBase = 1,
  opciones: OpcionesEscenario = {},
): Resultado[] {
  return Array.from({ length: n }, (_, i) => simularEntradas(entradas, semillaBase + i, CONFIG_DEFECTO, opciones));
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
