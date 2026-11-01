// Nivel de calidad de la escena (ver `scene/calidad.ts`). Es solo de la interfaz: no toca la simulación.

import { create } from 'zustand';
import { NIVEL_MAXIMO, nivelInicial } from '../scene/calidad.ts';

interface CalidadStore {
  nivel: number;
  bajar: () => void;
}

export const useCalidad = create<CalidadStore>((set) => ({
  nivel: nivelInicial(typeof window === 'undefined' ? '' : window.location.search, import.meta.env.DEV),
  bajar: () => set((s) => ({ nivel: Math.min(NIVEL_MAXIMO, s.nivel + 1) })),
}));
