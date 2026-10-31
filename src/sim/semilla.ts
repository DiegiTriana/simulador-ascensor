// La semilla no es una entrada visible: por defecto es fija, para que las mismas entradas den
// siempre el mismo resultado. El botón «Otra muestra aleatoria» (Avanzado) la cambia.

export const SEMILLA_DEFECTO = 1;

const SEMILLA_MAX = 0x7fffffff;

/** Una semilla nueva, distinta de la actual. `azar` se puede inyectar en las pruebas. */
export function otraSemilla(actual: number, azar: () => number = Math.random): number {
  for (let intento = 0; intento < 10; intento++) {
    const s = 1 + Math.floor(azar() * (SEMILLA_MAX - 1));
    if (s !== actual) return s;
  }
  return actual === SEMILLA_MAX ? 1 : actual + 1;
}
