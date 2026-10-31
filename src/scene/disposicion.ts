// Dónde se para cada persona: la fila en el vestíbulo de un piso y los lugares de la cabina. Todo es función
// del número de lugar y del número de la persona; nada usa el generador aleatorio de la simulación.

import { CABINA, TORRE } from './medidas.ts';

export interface Lugar {
  x: number;
  z: number;
  /** Giro alrededor de y; los modelos miran a +z cuando el giro es 0. */
  giro: number;
}

/** Quien espera mira a la puerta del ascensor (hacia +x). */
const GIRO_A_LA_PUERTA = Math.PI / 2;
/** Quien va en la cabina mira a su puerta (hacia −x). */
const GIRO_EN_CABINA = -Math.PI / 2;

const COLUMNAS_FILA = [0, -1, 1] as const;
const PASO_ANCHO_FILA = 1.3;
const PASO_FONDO_FILA = 0.9;
/** Distancia de la primera fila a la pared de las puertas (la persona tiene unos 0,4 de medio fondo). */
const X_PRIMERA_FILA = TORRE.xPuertas - 0.7;

/** Pequeño desvío fijo por persona para que la fila no parezca una cuadrícula. Entre −0,5 y 0,5. */
export function desvio(id: number, semilla = 0): number {
  const n = Math.imul((id + 1) * 2654435761 + semilla * 40503, 2246822519) >>> 0;
  return (n % 1000) / 1000 - 0.5;
}

/** Lugar en la fila de un vestíbulo: el 0 es el primero frente a la puerta; se llena de a tres por hilera. */
export function lugarEnFila(indice: number, id = indice): Lugar {
  const hilera = Math.floor(indice / 3);
  const columna = COLUMNAS_FILA[indice % 3];
  return {
    x: X_PRIMERA_FILA - hilera * PASO_FONDO_FILA + desvio(id, 1) * 0.14,
    z: TORRE.zc + columna * PASO_ANCHO_FILA + desvio(id, 2) * 0.16,
    giro: GIRO_A_LA_PUERTA + desvio(id, 3) * 0.2,
  };
}

const COLUMNAS_CABINA = [0, -1, 1] as const;
const PASO_ANCHO_CABINA = 1.4;
const PASO_FONDO_CABINA = 0.85;
const HILERAS_CABINA = 4;

/**
 * Lugar dentro de la cabina, en coordenadas de la cabina (x a lo largo del fondo, z a lo ancho, origen en el
 * centro del piso de la cabina). Se llena desde el fondo hacia la puerta, de a tres por hilera.
 */
export function lugarEnCabina(indice: number): Lugar {
  const hilera = Math.floor(indice / 3);
  if (hilera >= HILERAS_CABINA) throw new RangeError(`La cabina dibujada solo tiene ${HILERAS_CABINA * 3} lugares`);
  const centrado = (HILERAS_CABINA - 1) / 2;
  return {
    x: (centrado - hilera) * PASO_FONDO_CABINA,
    z: COLUMNAS_CABINA[indice % 3] * PASO_ANCHO_CABINA,
    giro: GIRO_EN_CABINA,
  };
}

/** Mitad del fondo y del ancho interiores de la cabina, para comprobar que nadie sale de ella. */
export const MITAD_INTERIOR_CABINA = { x: CABINA.fondo / 2, z: CABINA.ancho / 2 } as const;

// ---------------------------------------------------------------- cupos en la cabina

/** Un lugar de pie de la cabina: 4 hileras (del fondo a la puerta) por 3 columnas. */
export interface Celda {
  fila: number;
  columna: -1 | 0 | 1;
  /** Posición en coordenadas de la cabina (x a lo largo del fondo, z a lo ancho). */
  x: number;
  z: number;
}

/** Las 12 celdas, del fondo hacia la puerta; en cada hilera primero el centro, después la izquierda y la derecha. */
export const CELDAS_CABINA: readonly Celda[] = Array.from({ length: HILERAS_CABINA * 3 }, (_, i) => {
  const lugar = lugarEnCabina(i);
  const columna = COLUMNAS_CABINA[i % 3];
  return { fila: Math.floor(i / 3), columna, x: lugar.x, z: lugar.z };
});

/**
 * Elige las celdas para alguien que ocupa `cupos` cupos: 1 = una celda; 2 (muletas) = dos celdas juntas de una
 * hilera; 3 (silla de ruedas) = una hilera entera. `usadas[i]` es cuántos ocupan la celda i. Si no hay dónde (la
 * cabina tiene 12 celdas para 10 cupos, y las hileras pueden quedar con huecos sueltos), se pone en la hilera con
 * menos gente y se encima un poco: es raro y solo se ve.
 */
export function asignarCeldas(usadas: readonly number[], cupos: number): number[] {
  const libre = (i: number) => (usadas[i] ?? 0) === 0;
  const celdasDe = (fila: number, columnas: readonly (-1 | 0 | 1)[]) =>
    columnas.map((c) => CELDAS_CABINA.findIndex((x) => x.fila === fila && x.columna === c));
  const juegos: readonly (readonly (-1 | 0 | 1)[])[] =
    cupos >= 3 ? [[-1, 0, 1]] : cupos === 2 ? [[-1, 0], [0, 1]] : [[0], [-1], [1]];
  for (let fila = 0; fila < HILERAS_CABINA; fila++) {
    for (const columnas of juegos) {
      const celdas = celdasDe(fila, columnas);
      if (celdas.every(libre)) return celdas;
    }
  }
  // Sin lugar libre: la hilera menos ocupada.
  let mejor = 0;
  let menos = Infinity;
  for (let fila = 0; fila < HILERAS_CABINA; fila++) {
    const ocupadas = celdasDe(fila, [-1, 0, 1]).reduce((s, i) => s + (usadas[i] ?? 0), 0);
    if (ocupadas < menos) {
      menos = ocupadas;
      mejor = fila;
    }
  }
  return celdasDe(mejor, juegos[0]);
}

/** El punto medio de las celdas de alguien (para una silla o unas muletas, el centro de lo que ocupan). */
export function puntoDeCeldas(celdas: readonly number[]): { x: number; z: number } {
  const n = celdas.length || 1;
  return {
    x: celdas.reduce((s, i) => s + CELDAS_CABINA[i].x, 0) / n,
    z: celdas.reduce((s, i) => s + CELDAS_CABINA[i].z, 0) / n,
  };
}
