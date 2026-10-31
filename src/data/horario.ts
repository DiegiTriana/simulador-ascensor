// Bloques de clase de la universidad, en formato de 24 horas (docs/referencias/horario.png).
// Cada límite entre bloques es un cambio de clase.

export interface Bloque {
  numero: number;
  /** Minutos desde la medianoche. */
  inicio: number;
  fin: number;
}

const hm = (h: number, m: number) => h * 60 + m;

const LIMITES: number[] = [
  hm(6, 0), hm(6, 50), hm(7, 40), hm(8, 30), hm(9, 20), hm(10, 10), hm(11, 0),
  hm(11, 50), hm(12, 40), hm(13, 30), hm(14, 20), hm(15, 10), hm(16, 0), hm(16, 50),
  hm(17, 40), hm(18, 20), hm(19, 5), hm(19, 50), hm(20, 35), hm(21, 20), hm(22, 5),
];

export const BLOQUES: readonly Bloque[] = LIMITES.slice(0, -1).map((inicio, i) => ({
  numero: i + 1,
  inicio,
  fin: LIMITES[i + 1],
}));

/** Todos los cambios de clase del día (minutos desde la medianoche). */
export const CAMBIOS_DE_CLASE: readonly number[] = LIMITES;

/** Cambios de clase dentro de [inicio, inicio + duración], ambos extremos incluidos. */
export function cambiosEnFranja(inicioMin: number, duracionMin: number): number[] {
  const fin = inicioMin + duracionMin;
  return CAMBIOS_DE_CLASE.filter((c) => c >= inicioMin && c <= fin);
}

export function formatoHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
