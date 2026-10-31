// La corrida que se anima (la corrida 1 de las 10) y su reloj simulado. Es el único dueño del reloj: la escena lo lee
// en cada cuadro y la interfaz lo muestra, pero nadie más lo mueve. Cada simulación nueva, cada cambio de entradas
// y cada «Simular» descartan la corrida (el número de `id` cambia y la escena recoloca todo).
//
// `reloj.t` es el segundo simulado desde el inicio de la franja. Se cambia sin pasar por `set` (ocurre en cada
// cuadro y no debe volver a dibujar la interfaz); `saltos` avisa de los cambios que no vienen del avance normal.

import { create } from 'zustand';
import { construirIndice, type Indice } from '../scene/corrida.ts';
import type { Entradas, Traza } from '../sim/tipos.ts';

/** Segundos simulados por segundo real. */
export const VELOCIDADES = [1, 2, 5, 10, 30, 60] as const;
export const VELOCIDAD_INICIAL = 10;
/**
 * Lo máximo que avanza el reloj en un cuadro. Si la pestaña estuvo oculta o el equipo se trabó, el reloj no da un
 * salto: sigue desde donde iba.
 */
export const AVANCE_MAXIMO_S = 0.25;

export interface Corrida {
  /** Cambia con cada corrida nueva: lo que dependa de ella se vuelve a crear. */
  id: number;
  traza: Traza;
  indice: Indice;
  /** Las entradas con que se simuló (la hora de inicio pone el reloj del día). */
  entradas: Entradas;
  reloj: { t: number };
}

interface Estado {
  corrida: Corrida | null;
  enMarcha: boolean;
  /** El reloj llegó al final de la corrida. */
  terminada: boolean;
  velocidad: number;
  /** Sube con cada salto del reloj (mover la barra, volver al inicio) y con cada cambio de corrida. */
  saltos: number;

  cargar(traza: Traza, entradas: Entradas, opciones?: { enMarcha?: boolean }): void;
  descartar(): void;
  reproducir(): void;
  pausar(): void;
  alternar(): void;
  fijarVelocidad(velocidad: number): void;
  /** Vuelve al segundo 0 y reproduce. */
  reiniciar(): void;
  saltarA(t: number): void;
  /** Avanza el reloj `dtReal` segundos reales (si está en marcha). Devuelve true si el reloj cambió. */
  avanzar(dtReal: number): boolean;
}

let ultimoId = 0;

export const useAnimacion = create<Estado>()((set, get) => ({
  corrida: null,
  enMarcha: false,
  terminada: false,
  velocidad: VELOCIDAD_INICIAL,
  saltos: 0,

  cargar(traza, entradas, opciones = {}) {
    const corrida: Corrida = { id: ++ultimoId, traza, indice: construirIndice(traza), entradas, reloj: { t: 0 } };
    set((s) => ({ corrida, enMarcha: opciones.enMarcha ?? true, terminada: false, saltos: s.saltos + 1 }));
  },

  descartar() {
    if (!get().corrida) return;
    set((s) => ({ corrida: null, enMarcha: false, terminada: false, saltos: s.saltos + 1 }));
  },

  reproducir() {
    const { corrida, terminada } = get();
    if (!corrida) return;
    if (terminada) get().reiniciar();
    else set({ enMarcha: true });
  },

  pausar() {
    if (get().enMarcha) set({ enMarcha: false });
  },

  alternar() {
    if (get().enMarcha) get().pausar();
    else get().reproducir();
  },

  fijarVelocidad(velocidad) {
    if ((VELOCIDADES as readonly number[]).includes(velocidad)) set({ velocidad });
  },

  reiniciar() {
    const { corrida } = get();
    if (!corrida) return;
    corrida.reloj.t = 0;
    set((s) => ({ enMarcha: true, terminada: false, saltos: s.saltos + 1 }));
  },

  saltarA(t) {
    const { corrida } = get();
    if (!corrida || !Number.isFinite(t)) return;
    const fin = corrida.indice.fin;
    corrida.reloj.t = Math.min(fin, Math.max(0, t));
    const alFinal = corrida.reloj.t >= fin;
    set((s) => ({ terminada: alFinal, enMarcha: alFinal ? false : s.enMarcha, saltos: s.saltos + 1 }));
  },

  avanzar(dtReal) {
    const { corrida, enMarcha, velocidad } = get();
    if (!corrida || !enMarcha || !(dtReal > 0)) return false;
    const fin = corrida.indice.fin;
    corrida.reloj.t = Math.min(fin, corrida.reloj.t + Math.min(dtReal, AVANCE_MAXIMO_S) * velocidad);
    if (corrida.reloj.t >= fin) set({ enMarcha: false, terminada: true });
    return true;
  },
}));
