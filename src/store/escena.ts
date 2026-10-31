// Vista de la escena (exterior o desde un piso) y piso elegido. Es solo de la interfaz: cambiar de vista no
// pausa ni reinicia nada de la simulación.

import { create } from 'zustand';
import { PISO_MAXIMO } from '../scene/medidas.ts';
import type { Vista } from '../scene/vistas.ts';

export const PISO_INICIAL = 1;

export const limitarPiso = (piso: number): number => Math.min(PISO_MAXIMO, Math.max(1, Math.round(piso)));

interface EscenaStore {
  vista: Vista;
  /** Piso de la vista desde un piso: 1..9. */
  piso: number;
  /** Sube cada vez que se pide volver a la cámara de origen de la vista exterior. */
  restablecer: number;
  fijarVista: (vista: Vista) => void;
  fijarPiso: (piso: number) => void;
  cambiarPiso: (delta: number) => void;
  restablecerCamara: () => void;
}

/** Solo en desarrollo: ?vista=piso&piso=4 abre la escena ya en esa vista. */
function inicial(busqueda: string): Pick<EscenaStore, 'vista' | 'piso'> {
  if (!import.meta.env.DEV) return { vista: 'exterior', piso: PISO_INICIAL };
  const q = new URLSearchParams(busqueda);
  const piso = Number(q.get('piso'));
  return {
    vista: q.get('vista') === 'piso' ? 'piso' : 'exterior',
    piso: q.has('piso') && Number.isFinite(piso) ? limitarPiso(piso) : PISO_INICIAL,
  };
}

export const useEscena = create<EscenaStore>((set) => ({
  ...inicial(typeof window === 'undefined' ? '' : window.location.search),
  restablecer: 0,
  fijarVista: (vista) => set({ vista }),
  fijarPiso: (piso) => set({ piso: limitarPiso(piso) }),
  cambiarPiso: (delta) => set((s) => ({ piso: limitarPiso(s.piso + delta) })),
  restablecerCamara: () => set((s) => ({ vista: 'exterior', restablecer: s.restablecer + 1 })),
}));
