// Datos de la tabla comparativa y de los indicadores, ya formateados. Sin React, con pruebas.
// λ = personas ÷ duración (franja) o λ de los picos; μ = la medida en la simulación.

import { esCasoMiercoles, REAL_MIERCOLES } from '../data/casos.ts';
import { estadistica, type Comparacion, type Estadistica } from '../sim/corridas.ts';
import type { ResultadoMM1K } from '../sim/formulas.ts';
import type { Entradas, Resultado } from '../sim/tipos.ts';
import { coma } from './formato.ts';

export interface Celda {
  valor: string;
  /** «± 1,2», solo en la simulación. */
  pm?: string;
  /** Segunda línea pequeña: el mismo dato en los picos. */
  picos?: { valor: string; pm?: string };
}

export interface Fila {
  id: string;
  etiqueta: string;
  /** Aclaración corta bajo la etiqueta (qué es). */
  detalle?: string;
  franja: Celda | null;
  picos: Celda | null;
  sim: Celda | null;
  destacada?: boolean;
}

export interface FilaReal {
  picos: string;
  total: string;
}

export interface TablaModelo {
  filas: Fila[];
  real: FilaReal | null;
  frase: string | null;
}

/** Espacio sin salto entre la cifra y el %, para que no queden en renglones distintos. */
const PCT = ' %';

const num = (n: number | null | undefined, d: number): Celda | null =>
  n === null || n === undefined || !Number.isFinite(n) ? null : { valor: coma(n, d) };

const cel = (e: Estadistica | null | undefined, d: number): Celda | null =>
  e ? { valor: coma(e.media, d), pm: `± ${coma(e.sd, d)}` } : null;

const conPicos = (franja: Celda | null, picos: Celda | null): Celda | null =>
  franja ? { ...franja, picos: picos ? { valor: picos.valor, pm: picos.pm } : undefined } : null;

const est = (xs: (number | null | undefined)[]): Estadistica | null =>
  estadistica(xs.filter((x): x is number => x !== null && x !== undefined && Number.isFinite(x)));

/** Vuelta saturada: la que dejó gente afuera y no fue la del aseo (misma definición que μ). */
export function duracionVueltaSaturada(r: Resultado): number | null {
  const v = r.vueltas.filter((x) => !x.aseo && x.quedanAfuera > 0 && x.duracion !== null);
  return v.length ? v.reduce((s, x) => s + (x.duracion as number), 0) / v.length : null;
}

/** Nombre y aclaración de cada fila (la Ayuda y la tabla vacía usan los mismos textos). */
const ET: Record<string, Pick<Fila, 'id' | 'etiqueta' | 'detalle' | 'destacada'>> = {
  'escaleras-picos': { id: 'escaleras-picos', etiqueta: 'Escaleras en los picos', detalle: 'personas que se van, en % (P_K en las fórmulas)', destacada: true },
  'escaleras-total': { id: 'escaleras-total', etiqueta: 'Escaleras en toda la franja', detalle: 'personas que se van, en % (P_K en las fórmulas)', destacada: true },
  'lambda': { id: 'lambda', etiqueta: 'λ', detalle: 'personas que llegan por minuto' },
  'mu': { id: 'mu', etiqueta: 'μ', detalle: 'personas que suben por minuto, medidas en la simulación' },
  'rho': { id: 'rho', etiqueta: 'ρ', detalle: 'λ ÷ μ' },
  'L': { id: 'L', etiqueta: 'L', detalle: 'personas en el sistema' },
  'Lq': { id: 'Lq', etiqueta: 'Lq', detalle: 'personas en la fila' },
  'W': { id: 'W', etiqueta: 'W', detalle: 'segundos desde que llegan hasta que bajan, de quienes entran' },
  'Wq': { id: 'Wq', etiqueta: 'Wq', detalle: 'segundos de espera en la fila, de quienes entran' },
  'lambdaEf': { id: 'lambdaEf', etiqueta: 'λef', detalle: 'personas que entran por minuto: λ(1 − P_K)' },
};

/** Las filas sin datos: lo que se ve antes de simular. */
export function filasVacias(): Fila[] {
  return Object.values(ET).map((f) => ({ ...f, franja: null, picos: null, sim: null }));
}

function fraseConclusion(c: Comparacion): string | null {
  const a = c.formulasFranja ? c.formulasFranja.pK * 100 : null;
  const b = c.formulasPico ? c.formulasPico.pK * 100 : null;
  const sp = c.sim.abandonoPicoPct?.media ?? null;
  const st = c.sim.abandonoPct?.media ?? null;
  if (a === null && b === null) {
    return 'El ascensor no se llenó en ninguna vuelta, así que no se pudo medir μ y las fórmulas quedan sin calcular.';
  }
  const formulas = [a !== null ? `${coma(a)}${PCT} (toda la franja)` : null, b !== null ? `${coma(b)}${PCT} (picos)` : null].filter(Boolean);
  const sim = [sp !== null ? `${coma(sp)}${PCT} en los picos` : null, st !== null ? `${coma(st)}${PCT} en total` : null].filter(Boolean);
  if (sim.length === 0) return null;
  let frase = `Las fórmulas dan ${formulas.join(' y ')}; la simulación, ${sim.join(' y ')}.`;
  // «Se quedan cortas» solo si cada fórmula da menos que su simulación (picos con picos, franja con total).
  const pares: boolean[] = [];
  if (b !== null && sp !== null) pares.push(b < sp);
  if (a !== null && st !== null) pares.push(a < st);
  if (pares.length > 0 && pares.every(Boolean)) frase += ' Las fórmulas se quedan cortas.';
  return frase;
}

export function construirTabla(entradas: Entradas, c: Comparacion): TablaModelo {
  const F = c.formulasFranja;
  const P = c.formulasPico;
  const corridas = c.corridas;
  const lambdaFranja = entradas.llegadasP1 / entradas.duracionMin;
  const de = (m: ResultadoMM1K | null, f: (m: ResultadoMM1K) => number, d: number) => (m ? num(f(m), d) : null);

  const rhoFranja = est(corridas.map((r) => (r.muPorMin ? lambdaFranja / r.muPorMin : null)));
  const rhoPico = est(corridas.map((r) => (r.muPorMin && r.pico.lambdaPorMin !== null ? r.pico.lambdaPorMin / r.muPorMin : null)));
  const lambdaEf = est(corridas.map((r) => r.abordaron / entradas.duracionMin));

  const filas: Fila[] = [
    {
      ...ET['escaleras-picos'],
      franja: null,
      picos: P ? num(P.pK * 100, 1) : null,
      sim: cel(c.sim.abandonoPicoPct, 1),
    },
    {
      ...ET['escaleras-total'],
      franja: F ? num(F.pK * 100, 1) : null,
      picos: null,
      sim: cel(c.sim.abandonoPct, 1),
    },
    {
      ...ET['lambda'],
      franja: de(F, (m) => m.lambda, 2),
      picos: de(P, (m) => m.lambda, 2),
      // λ es un dato de entrada (sale de las personas y de la forma de los picos), no una medida: sin ±.
      sim: conPicos(num(lambdaFranja, 2), num(c.sim.lambdaPicoPorMin?.media, 2)),
    },
    {
      ...ET['mu'],
      franja: de(F, (m) => m.mu, 2),
      picos: de(P, (m) => m.mu, 2),
      sim: cel(c.sim.muPorMin, 2),
    },
    {
      ...ET['rho'],
      franja: de(F, (m) => m.rho, 2),
      picos: de(P, (m) => m.rho, 2),
      sim: conPicos(cel(rhoFranja, 2), cel(rhoPico, 2)),
    },
    {
      ...ET['L'],
      franja: de(F, (m) => m.L, 1),
      picos: de(P, (m) => m.L, 1),
      sim: conPicos(cel(c.sim.L, 1), cel(c.sim.LPico, 1)),
    },
    {
      ...ET['Lq'],
      franja: de(F, (m) => m.Lq, 1),
      picos: de(P, (m) => m.Lq, 1),
      sim: conPicos(cel(c.sim.Lq, 1), cel(c.sim.LqPico, 1)),
    },
    {
      ...ET['W'],
      franja: de(F, (m) => m.WEf * 60, 0),
      picos: de(P, (m) => m.WEf * 60, 0),
      sim: cel(c.sim.WSeg, 0),
    },
    {
      ...ET['Wq'],
      franja: de(F, (m) => m.WqEf * 60, 0),
      picos: de(P, (m) => m.WqEf * 60, 0),
      sim: cel(c.sim.WqSeg, 0),
    },
    {
      ...ET['lambdaEf'],
      franja: de(F, (m) => m.lambdaEf, 2),
      picos: de(P, (m) => m.lambdaEf, 2),
      sim: cel(lambdaEf, 2),
    },
  ];

  return {
    filas,
    real: esCasoMiercoles(entradas)
      ? { picos: `${coma(REAL_MIERCOLES.picosPct)}${PCT}`, total: `${coma(REAL_MIERCOLES.totalPct)}${PCT}` }
      : null,
    frase: fraseConclusion(c),
  };
}

export interface Indicadores {
  /** De qué se compara: los picos o, si la franja no tiene picos, toda la franja. */
  base: 'picos' | 'total';
  simulacion: number | null;
  formulas: number | null;
  real: number | null;
  filaMaxima: number | null;
  esperaSeg: number | null;
  vueltaSeg: number | null;
}

export function indicadoresDe(entradas: Entradas, c: Comparacion): Indicadores {
  const hayPicos = c.sim.abandonoPicoPct !== null && c.formulasPico !== null;
  const formulas = hayPicos ? c.formulasPico : c.formulasFranja;
  return {
    base: hayPicos ? 'picos' : 'total',
    simulacion: (hayPicos ? c.sim.abandonoPicoPct : c.sim.abandonoPct)?.media ?? null,
    formulas: formulas ? formulas.pK * 100 : null,
    real: esCasoMiercoles(entradas) ? (hayPicos ? REAL_MIERCOLES.picosPct : REAL_MIERCOLES.totalPct) : null,
    filaMaxima: c.sim.filaMaxima?.media ?? null,
    esperaSeg: c.sim.WqSeg?.media ?? null,
    vueltaSeg: est(c.corridas.map(duracionVueltaSaturada))?.media ?? null,
  };
}
