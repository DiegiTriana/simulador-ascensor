// Vista de la escena (exterior, desde un piso, edificio completo o planta) y piso elegido. Es solo de la interfaz: cambiar de vista no
// pausa ni reinicia nada de la simulación.

import { create } from 'zustand';
import { PISO_MAXIMO } from '../scene/medidas.ts';
import type { Encuadre, Vista } from '../scene/vistas.ts';

export const PISO_INICIAL = 1;

export const limitarPiso = (piso: number): number => Math.min(PISO_MAXIMO, Math.max(1, Math.round(piso)));

interface EscenaStore {
  vista: Vista;
  /** Piso de las vistas desde un piso y planta: 1..9. */
  piso: number;
  /** Encuadre de la vista exterior: todo el edificio o el pie de la torre. */
  encuadre: Encuadre;
  /** Sube cada vez que se pide un encuadre, aunque sea el mismo, para que la cámara vuelva a él. */
  orden: number;
  fijarVista: (vista: Vista) => void;
  fijarPiso: (piso: number) => void;
  cambiarPiso: (delta: number) => void;
  restablecerCamara: () => void;
  verLaFila: () => void;
}

const VISTAS: readonly Vista[] = ['exterior', 'piso', 'completo', 'planta'];

/** Solo en desarrollo: ?vista=piso&piso=4 (o completo, planta) abre la escena ya en esa vista. */
function inicial(busqueda: string): Pick<EscenaStore, 'vista' | 'piso'> {
  if (!import.meta.env.DEV) return { vista: 'exterior', piso: PISO_INICIAL };
  const q = new URLSearchParams(busqueda);
  const piso = Number(q.get('piso'));
  return {
    vista: VISTAS.find((v) => v === q.get('vista')) ?? 'exterior',
    piso: q.has('piso') && Number.isFinite(piso) ? limitarPiso(piso) : PISO_INICIAL,
  };
}

export const useEscena = create<EscenaStore>((set) => ({
  ...inicial(typeof window === 'undefined' ? '' : window.location.search),
  encuadre: 'todo',
  orden: 0,
  fijarVista: (vista) => set({ vista }),
  fijarPiso: (piso) => set({ piso: limitarPiso(piso) }),
  cambiarPiso: (delta) => set((s) => ({ piso: limitarPiso(s.piso + delta) })),
  restablecerCamara: () => set((s) => ({ vista: 'exterior', encuadre: 'todo', orden: s.orden + 1 })),
  verLaFila: () => set((s) => ({ vista: 'exterior', encuadre: 'fila', orden: s.orden + 1 })),
}));
