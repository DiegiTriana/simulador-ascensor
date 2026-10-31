// Poses de cámara de las dos vistas de esta parte: exterior y desde un piso. Son funciones puras del tamaño
// del lienzo y del piso, para que se puedan probar sin dibujar nada.

import { BLOQUE, PASILLO, TORRE, Y_FONDO, Y_TECHO, yPiso } from './medidas.ts';

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
const FOV_PISO = 40;
/** Distancia preferida de la cámara a la pared de las puertas (en metros), de pie al fondo del pasillo. */
const DISTANCIA_PISO = 9.4;

/** Cámara de una persona esperando al fondo del pasillo de un piso, mirando la puerta del ascensor. */
export function posePiso(piso: number, aspecto: number): Pose {
  const suelo = yPiso(piso);
  const tFov = Math.tan(rad(FOV_PISO / 2));
  // En pantallas angostas la cámara retrocede hasta que se vea el ancho de la torre (sin salirse del pasillo).
  const distanciaNecesaria = ANCHO_VISIBLE_PISO / (2 * tFov * Math.max(aspecto, 0.3));
  const x = Math.max(PASILLO.x0 + 0.6, TORRE.xPuertas - Math.max(DISTANCIA_PISO, distanciaNecesaria));
  return {
    posicion: [x, suelo + 1.95, TORRE.zc],
    objetivo: [TORRE.xPuertas, suelo + 0.8, TORRE.zc],
    fov: FOV_PISO,
  };
}

export function poseDe(vista: Vista, piso: number, aspecto: number): Pose {
  return vista === 'exterior' ? poseExterior(aspecto) : posePiso(piso, aspecto);
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
