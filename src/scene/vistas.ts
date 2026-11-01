// Poses de cámara de las cuatro vistas: exterior, desde un piso, edificio completo y planta. Son funciones puras
// del tamaño del lienzo y del piso, para que se puedan probar sin dibujar nada.

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

export type Vista = 'exterior' | 'piso' | 'completo' | 'planta';

/** Vistas en las que se elige un piso (P1 a P9). */
export const VISTAS_CON_PISO: readonly Vista[] = ['piso', 'planta'];
export type Vec3 = [number, number, number];

export interface Pose {
  posicion: Vec3;
  objetivo: Vec3;
  /** Campo de visión vertical, en grados. */
  fov: number;
  /** Hacia dónde queda «arriba» en la pantalla (por defecto +y). La planta mira hacia abajo y necesita otro. */
  arriba?: Vec3;
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

/**
 * Solo en desarrollo, en la vista desde un piso: ?camara=px,py,pz,ox,oy,oz[,fov] pone la cámara donde se pida (por
 * ejemplo, cerca de una persona para revisar sus accesorios). Devuelve null si falta o es inválido.
 */
export function poseDePrueba(busqueda: string): Pose | null {
  const valor = new URLSearchParams(busqueda).get('camara');
  if (!valor) return null;
  const n = valor.split(',').map((x) => Number(x.trim()));
  if (n.length < 6 || n.length > 7 || n.some((x) => !Number.isFinite(x))) return null;
  const fov = n[6] ?? 40;
  if (fov < 10 || fov > 100) return null;
  return { posicion: [n[0], n[1], n[2]], objetivo: [n[3], n[4], n[5]], fov };
}

/** Edificio completo: de frente y sin giro, con campo de visión angosto, para leer los pisos a su altura. */
const COMPLETO = { elevacion: 3, fov: 20, margen: 1.4 };

/** El edificio de P10 al sótano, con su bloque y su torre, visto de frente (la cabina y las filas de cada piso). */
export function poseCompleto(aspecto: number): Pose {
  const mitadAlto = (Y_TECHO - Y_FONDO) / 2 + COMPLETO.margen;
  const mitadAncho = (TORRE.x1 - BLOQUE.x0) / 2 + COMPLETO.margen;
  const t = Math.tan(rad(COMPLETO.fov / 2));
  const d = Math.max(mitadAlto / t, mitadAncho / (t * Math.max(aspecto, 0.3)));
  const el = rad(COMPLETO.elevacion);
  const objetivo: Vec3 = [(BLOQUE.x0 + TORRE.x1) / 2, (Y_TECHO + Y_FONDO) / 2, TORRE.z1];
  return {
    posicion: [objetivo[0], objetivo[1] + d * Math.sin(el), objetivo[2] + d * Math.cos(el)],
    objetivo,
    fov: COMPLETO.fov,
  };
}

/** Planta: se corta el piso a esta altura sobre su suelo: sobre las cabezas (1,2) y bajo el techo de la cabina (1,9). */
export const ALTURA_DE_CORTE = 1.7;
/** Lo que debe verse en la planta: el pasillo, el vestíbulo y el pozo, con su margen. */
const PLANTA = { fov: 28, margen: 1.2 };

/** Altura (y) del plano que corta la planta de un piso: lo que queda más arriba no se dibuja. */
export const alturaDeCorte = (piso: number): number => yPiso(piso) + ALTURA_DE_CORTE;

/**
 * Planta de un piso: la cámara mira hacia abajo desde arriba del pasillo, el vestíbulo y el pozo, con el frente del
 * edificio hacia abajo de la pantalla. Se cortan el techo y todo lo que está más arriba.
 */
export function posePlanta(piso: number, aspecto: number): Pose {
  const suelo = yPiso(piso);
  const x0 = PASILLO.x0;
  const x1 = TORRE.x1;
  const mitadAncho = (x1 - x0) / 2 + PLANTA.margen;
  const mitadAlto = (TORRE.z1 - TORRE.z0) / 2 + PLANTA.margen;
  const t = Math.tan(rad(PLANTA.fov / 2));
  const d = Math.max(mitadAlto / t, mitadAncho / (t * Math.max(aspecto, 0.3)));
  const centro: Vec3 = [(x0 + x1) / 2, suelo, TORRE.zc];
  // Un poco corrida hacia el frente para que la orientación de la pantalla no quede indefinida.
  return { posicion: [centro[0], suelo + d, centro[2] + 0.001], objetivo: centro, fov: PLANTA.fov, arriba: [0, 0, -1] };
}

export function poseDe(vista: Vista, piso: number, aspecto: number, encuadre: Encuadre = 'todo'): Pose {
  if (vista === 'piso') return posePiso(piso, aspecto);
  if (vista === 'completo') return poseCompleto(aspecto);
  if (vista === 'planta') return posePlanta(piso, aspecto);
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
