// Lo que la escena necesita para dibujar un instante. En la parte 1 es un estado fijo de prueba; en la parte 2
// lo calcula el reloj simulado a partir de la corrida 1.

import type { TipoPersona } from '../sim/tipos.ts';
import { PISO_MAXIMO, PISO_SOTANO } from './medidas.ts';

export interface PersonaEscena {
  /** Número de la persona: de él sale el modelo y el desvío en la fila. */
  id: number;
  tipo: TipoPersona;
}

export interface EstadoEscena {
  cabina: {
    /** 0 = sótano, 1..9 = P1..P9; con decimales mientras la cabina va entre dos pisos. */
    piso: number;
    /** 0 = puertas cerradas, 1 = abiertas del todo (las de la cabina y las del piso donde está). */
    puertas: number;
    /** Sentido en que va: −1 baja, 0 parada sin dirección, 1 sube. */
    sentido: -1 | 0 | 1;
    ocupantes: PersonaEscena[];
  };
  /** Quienes esperan, por piso (el índice es el piso; 0 = sótano). El primero de cada lista es el primero de la fila. */
  filas: PersonaEscena[][];
}

const normal = (id: number): PersonaEscena => ({ id, tipo: 'normal' });
const gente = (desde: number, cuantas: number): PersonaEscena[] =>
  Array.from({ length: cuantas }, (_, i) => normal(desde + i));

function filasVacias(): PersonaEscena[][] {
  return Array.from({ length: PISO_MAXIMO + 1 }, () => []);
}

const como = (personas: PersonaEscena[], id: number, tipo: TipoPersona): PersonaEscena[] =>
  personas.map((p) => (p.id === id ? { ...p, tipo } : p));

/**
 * Estado fijo de muestra: cabina en P1 con las puertas abiertas y gente esperando en P1, P4 y P7, con una silla de
 * ruedas y alguien con muletas, para ver cómo se ven. El personal de aseo con su carrito solo aparece en una corrida.
 */
export function estadoDePrueba(): EstadoEscena {
  const filas = filasVacias();
  filas[1] = como(como(gente(10, 9), 11, 'silla'), 12, 'muletas');
  filas[4] = gente(30, 2);
  filas[7] = gente(40, 1);
  return { cabina: { piso: 1, puertas: 1, sentido: 0, ocupantes: como(gente(0, 4), 1, 'muletas') }, filas };
}

/**
 * Solo en desarrollo: la dirección puede cambiar el estado de prueba (?cabina=4.5&puertas=0&ocupantes=8&fila=20) para
 * revisar la escena sin simulación. En la versión publicada no hace nada.
 */
export function estadoDePruebaConParametros(busqueda: string): EstadoEscena {
  const estado = estadoDePrueba();
  const q = new URLSearchParams(busqueda);
  const num = (clave: string): number | null => {
    const v = q.get(clave);
    if (v === null || v.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const piso = num('cabina');
  if (piso !== null) estado.cabina.piso = Math.min(PISO_MAXIMO, Math.max(PISO_SOTANO, piso));
  const puertas = num('puertas');
  if (puertas !== null) estado.cabina.puertas = Math.min(1, Math.max(0, puertas));
  const fila = num('fila');
  if (fila !== null) estado.filas[1] = gente(10, Math.min(3000, Math.max(0, Math.floor(fila))));
  const ocupantes = num('ocupantes');
  if (ocupantes !== null) estado.cabina.ocupantes = gente(0, Math.min(10, Math.max(0, Math.floor(ocupantes))));
  return estado;
}
