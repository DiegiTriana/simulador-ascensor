// Medidas de la escena, en «metros de escena» (una persona mide ALTURA_PERSONA = 1,2). Ejes: x a la derecha
// (la torre de vidrio está en x > 0), y hacia arriba, z hacia el frente del edificio. El piso terminado de P1 está en y = 0.

import { CABINA_DIBUJADA } from '../data/modelos.ts';

/** Pisos: 0 = sótano (S), 1..9 = P1..P9 (los de la simulación) y 10 = P10, sin acceso. */
export const PISO_SOTANO = 0;
export const PISO_MAXIMO = 9;
export const PISO_SIN_ACCESO = 10;

/** De losa a losa. */
export const ALTURA_PISO = 2.6;
export const GROSOR_LOSA = 0.22;

/** Altura del piso terminado de un piso (S = −2,6; P1 = 0; P10 = 23,4). */
export const yPiso = (piso: number): number => (piso - 1) * ALTURA_PISO;
/** Techo del edificio, sobre P10. */
export const Y_TECHO = yPiso(PISO_SIN_ACCESO) + ALTURA_PISO;
/** Fondo de la excavación del sótano. */
export const Y_FONDO = yPiso(PISO_SOTANO);

/** Bloque alto de ladrillo. */
export const BLOQUE = { x0: -14, x1: 0, z0: -4, z1: 4 } as const;

/**
 * Torre de vidrio, adosada al costado derecho del bloque y a ras de su fachada. De izquierda a derecha: el
 * vestíbulo (x de 0 a xPuertas, donde espera la gente) y el pozo del ascensor (de xPuertas a x1).
 */
export const TORRE = { x0: 0, x1: 8, z0: -0.6, z1: 4, zc: 1.7, ancho: 4.6, xPuertas: 4 } as const;

/** Las puertas de cada piso y de la cabina miran hacia −x (hacia el vestíbulo). */
export const PUERTA = { ancho: 2, alto: 1.9 } as const;
export const GROSOR_PARED_POZO = 0.12;

/** Cabina: interior de CABINA_DIBUJADA; el fondo va a lo largo de x y el ancho a lo largo de z. */
export const CABINA = {
  ...CABINA_DIBUJADA,
  xCentro: 6.05,
  pared: 0.1,
} as const;

/** Pasillo del piso, a la izquierda del vestíbulo (solo se dibuja en la vista desde un piso). */
export const PASILLO = { x0: -8, x1: 0 } as const;
/** Cara interior de cada pared lateral del pasillo. */
export const PARED_IZQUIERDA_Z = TORRE.z0;
export const PARED_DERECHA_Z = TORRE.z1 - 0.02;

/**
 * Lo que se cuelga en las paredes del pasillo. Desde el fondo del pasillo solo se ven los últimos metros de cada
 * pared, así que va ahí; la cámara de la vista desde un piso se calcula para que todo esto se vea completo.
 */
export const DECORACION = {
  escaleras: { x: -0.95, ancho: 1, alto: 1.9, letreroY: 2.1, letreroAlto: 0.275 },
  numero: { x: -0.8, lado: 0.7, y: 1.6 },
  banca: { x: -0.8, ancho: 1, alto: 0.5, fondo: 0.45 },
  maceta: { x: -0.3 },
} as const;

/** La cabina solo está «en» un piso si queda a menos de esto del piso (en pisos). */
export const TOLERANCIA_PISO = 0.02;

/** Etiqueta corta del piso: S, P1, …, P10. */
export const etiquetaPiso = (piso: number): string => (piso === PISO_SOTANO ? 'S' : `P${piso}`);

/** Piso en el que está la cabina, o null si va entre dos pisos. */
export function pisoDeCabina(piso: number): number | null {
  const r = Math.round(piso);
  return Math.abs(piso - r) <= TOLERANCIA_PISO ? r : null;
}
