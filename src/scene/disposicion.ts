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
