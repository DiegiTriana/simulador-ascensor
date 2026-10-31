// Poses de cámara de las dos vistas de esta parte: exterior y desde un piso. Son funciones puras del tamaño
// del lienzo y del piso, para que se puedan probar sin dibujar nada.

import {
  BLOQUE,
  DECORACION,
  PARED_DERECHA_Z,
  PARED_IZQUIERDA_Z,
  PASILLO,
  TORRE,
  Y_FONDO,
  Y_TECHO,
  yPiso,
} from './medidas.ts';

export type Vista = 'exterior' | 'piso';
export type Vec3 = [number, number, number];

export interface Pose {
  posicion: Vec3;
  objetivo: Vec3;
  /** Campo de visión vertical, en grados. */
  fov: number;
}

const rad = (grados: number) => (grados * Math.PI) / 180;

/** Giro (desde +z hacia +x) y elevación de la cámara exterior, en grados. */
export const EXTERIOR = { azimut: 28, elevacion: 12, fov: 28 } as const;

/** Mitad del alto y del ancho que debe verse, en metros, para encuadrar todo el edificio con su torre. */
const MITAD_ALTO = (Y_TECHO - Y_FONDO) / 2 + 3;
const MITAD_ANCHO = (TORRE.x1 - BLOQUE.x0) / 2 + 1.5;
const CENTRO_EXTERIOR: Vec3 = [(BLOQUE.x0 + TORRE.x1) / 2 + 0.5, (Y_TECHO + Y_FONDO) / 2, 1];

/** Distancia a la que cabe todo el edificio, con el alto y el ancho del lienzo. */
export function distanciaExterior(aspecto: number): number {
  const t = Math.tan(rad(EXTERIOR.fov / 2));
  return Math.max(MITAD_ALTO / t, MITAD_ANCHO / (t * Math.max(aspecto, 0.3)));
}

export function poseExterior(aspecto: number): Pose {
  const d = distanciaExterior(aspecto);
  const az = rad(EXTERIOR.azimut);
  const el = rad(EXTERIOR.elevacion);
  const [cx, cy, cz] = CENTRO_EXTERIOR;
  return {
    posicion: [cx + d * Math.sin(az) * Math.cos(el), cy + d * Math.sin(el), cz + d * Math.cos(az) * Math.cos(el)],
    objetivo: [cx, cy, cz],
    fov: EXTERIOR.fov,
  };
}

/** Ancho mínimo, en el plano de las puertas, que debe verse en la vista desde un piso (la torre más un margen). */
const ANCHO_VISIBLE_PISO = TORRE.ancho + 1.4;
const FOV_PISO_MIN = 40;
const FOV_PISO_MAX = 75;
/** Distancia preferida de la cámara a la pared de las puertas (en metros), de pie al fondo del pasillo. */
const DISTANCIA_PISO = 10.6;
/** Los letreros deben quedar a menos de esta parte de la mitad del ancho de la pantalla (el resto es margen). */
const MARGEN_LETREROS = 0.88;

/** x del borde de los letreros y muebles más cercano a la cámara. */
const X_BORDE_DECORACION = Math.min(
  DECORACION.escaleras.x - DECORACION.escaleras.ancho / 2,
  DECORACION.numero.x - DECORACION.numero.lado / 2,
  DECORACION.banca.x - DECORACION.banca.ancho / 2,
);
/** Distancia lateral de la cámara (centrada en el pasillo) a la pared más lejana. */
const LATERAL_PASILLO = Math.max(PARED_DERECHA_Z - TORRE.zc, TORRE.zc - PARED_IZQUIERDA_Z);

/**
 * Cámara de una persona esperando al fondo del pasillo de un piso, mirando la puerta del ascensor. El campo de
 * visión se abre en lienzos angostos para que se vean completos los letreros de las paredes y el ancho de la torre.
 */
export function posePiso(piso: number, aspecto: number): Pose {
  const suelo = yPiso(piso);
  const x = Math.max(PASILLO.x0 + 0.6, TORRE.xPuertas - DISTANCIA_PISO);
  // Tangente del medio ángulo horizontal que hace falta para ver cada cosa.
  const paraLetreros = LATERAL_PASILLO / ((X_BORDE_DECORACION - x) * MARGEN_LETREROS);
  const paraTorre = ANCHO_VISIBLE_PISO / 2 / (TORRE.xPuertas - x);
  const tangenteVertical = Math.max(
    Math.tan(rad(FOV_PISO_MIN / 2)),
    Math.max(paraLetreros, paraTorre) / Math.max(aspecto, 0.3),
  );
  const fov = Math.min(FOV_PISO_MAX, (2 * Math.atan(tangenteVertical) * 180) / Math.PI);
  return {
    posicion: [x, suelo + 1.95, TORRE.zc],
    objetivo: [TORRE.xPuertas, suelo + 0.8, TORRE.zc],
    fov,
  };
}

/** Encuadre de la vista exterior: todo el edificio, o el pie de la torre (P1, la cabina y la fila). */
export type Encuadre = 'todo' | 'fila';

const FILA = { azimut: 22, elevacion: 8, fov: 28, objetivo: [4, 1.1, 2] as Vec3, mitadAlto: 2.7, mitadAncho: 5.2 };

/** Pie de la torre: el vestíbulo y el pozo de P1 con su fila y la cabina cuando está abajo. */
export function poseFila(aspecto: number): Pose {
  const t = Math.tan(rad(FILA.fov / 2));
  const d = Math.max(FILA.mitadAlto / t, FILA.mitadAncho / (t * Math.max(aspecto, 0.3)));
  const az = rad(FILA.azimut);
  const el = rad(FILA.elevacion);
  const [ox, oy, oz] = FILA.objetivo;
  return {
    posicion: [ox + d * Math.sin(az) * Math.cos(el), oy + d * Math.sin(el), oz + d * Math.cos(az) * Math.cos(el)],
    objetivo: FILA.objetivo,
    fov: FILA.fov,
  };
}

export function poseDe(vista: Vista, piso: number, aspecto: number, encuadre: Encuadre = 'todo'): Pose {
  if (vista === 'piso') return posePiso(piso, aspecto);
  return encuadre === 'fila' ? poseFila(aspecto) : poseExterior(aspecto);
}

/** Límites de la cámara del usuario en la vista exterior (radianes y metros). */
export function limitesExterior(aspecto: number) {
  const d = distanciaExterior(aspecto);
  return {
    azimutMin: rad(EXTERIOR.azimut - 40),
    azimutMax: rad(EXTERIOR.azimut + 40),
    polarMin: rad(90 - 40),
    polarMax: rad(90 - 2),
    distanciaMin: 7,
    distanciaMax: d * 1.25,
    /** Caja donde puede quedar el punto que mira la cámara. */
    objetivoMin: [BLOQUE.x0, Y_FONDO, -2] as Vec3,
    objetivoMax: [TORRE.x1, Y_TECHO, 4] as Vec3,
  };
}
