// Mensajes entre la página y el worker de las 10 corridas. Todo lleva el número de generación:
// quien recibe descarta lo que no sea de la generación vigente.

import type { Comparacion } from '../sim/corridas.ts';
import type { Entradas, Traza } from '../sim/tipos.ts';

export interface PeticionSimular {
  tipo: 'simular';
  generacion: number;
  entradas: Entradas;
  /** Semilla de la primera corrida; las demás usan semilla + i. */
  semilla: number;
  corridas: number;
}

export interface PeticionCancelar {
  tipo: 'cancelar';
  generacion: number;
}

export type Peticion = PeticionSimular | PeticionCancelar;

export type Respuesta =
  | { tipo: 'progreso'; generacion: number; hechas: number; total: number }
  /** La traza de la corrida 1 (la que se anima). Llega justo antes del resultado, con la misma generación. */
  | { tipo: 'traza'; generacion: number; traza: Traza }
  | { tipo: 'resultado'; generacion: number; comparacion: Comparacion }
  | { tipo: 'cancelado'; generacion: number }
  | { tipo: 'error'; generacion: number; mensaje: string };

export const CORRIDAS_DEFECTO = 10;
