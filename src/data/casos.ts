import type { Entradas } from '../sim/tipos.ts';

/** Caso del miércoles 21 de octubre: 12:40 a 13:30. */
export const CASO_MIERCOLES: Entradas = {
  horaInicioMin: 12 * 60 + 40,
  duracionMin: 50,
  llegadasP1: 119,
  bajan: 19,
  sillas: 0,
  muletas: 0,
  usosAseo: 1,
};

/** Lo que se contó en el edificio el miércoles (referencia, no entra en ningún cálculo). */
export const REAL_MIERCOLES = { picosPct: 20.6, totalPct: 18.5 } as const;

export function esCasoMiercoles(e: Entradas): boolean {
  return (Object.keys(CASO_MIERCOLES) as (keyof Entradas)[]).every((k) => e[k] === CASO_MIERCOLES[k]);
}
