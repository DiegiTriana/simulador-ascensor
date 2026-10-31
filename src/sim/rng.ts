// Generador con semilla (mulberry32): misma semilla, misma secuencia.

/** Devuelve un número en [0, 1). */
export type Rng = () => number;

export function crearRng(semilla: number): Rng {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function elegirPonderado<T extends { peso: number }>(rng: Rng, opciones: readonly T[]): T {
  const total = opciones.reduce((s, o) => s + o.peso, 0);
  let u = rng() * total;
  for (const o of opciones) {
    u -= o.peso;
    if (u < 0) return o;
  }
  return opciones[opciones.length - 1];
}

/** Baraja una copia (Fisher-Yates). */
export function barajar<T>(rng: Rng, lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
