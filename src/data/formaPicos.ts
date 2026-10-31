// Forma de las llegadas dentro de cada pico, tomada de la columna «Llegaron» del miércoles
// (docs/Datos_del_ascensor_y_plan_de_simulación.pdf, tabla de aperturas en P1; docx, hoja del 21 de octubre).
//
// «Llegaron» de cada vuelta son las personas que se juntaron en la fila de P1 entre la apertura
// anterior y esa apertura, así que cada tramo va de una apertura a la siguiente: llegadas y segundos.
//
// Pico 1, después del cambio de clase de las 12:40 (aperturas V1 a V5, 12:40:30 a 12:53:10):
//   V2 15 personas en 120 s, V3 13 en 125 s, V4 11 en 245 s, V5 7 en 270 s.
// Pico 2, antes del cambio de clase de las 13:30 (aperturas V9 a V13, 13:17:10 a 13:29:40):
//   V10 12 personas en 230 s, V11 13 en 135 s, V12 14 en 195 s, V13 7 en 190 s.
//
// Las 15 personas que ya esperaban a las 12:40 no entran aquí: se manejan aparte.

export interface Tramo {
  llegadas: number;
  segundos: number;
}

export const TRAMOS_PICO_DESPUES: readonly Tramo[] = [
  { llegadas: 15, segundos: 120 },
  { llegadas: 13, segundos: 125 },
  { llegadas: 11, segundos: 245 },
  { llegadas: 7, segundos: 270 },
];

export const TRAMOS_PICO_ANTES: readonly Tramo[] = [
  { llegadas: 12, segundos: 230 },
  { llegadas: 13, segundos: 135 },
  { llegadas: 14, segundos: 195 },
  { llegadas: 7, segundos: 190 },
];

/** Tramo normalizado: posición dentro del pico (de 0 a 1) y parte de las llegadas del pico. */
export interface TramoNormalizado {
  desde: number;
  hasta: number;
  /** Proporción de las llegadas del pico que cae en este tramo; todas suman 1. */
  proporcion: number;
}

export function normalizar(tramos: readonly Tramo[]): TramoNormalizado[] {
  const llegadas = tramos.reduce((s, t) => s + t.llegadas, 0);
  const segundos = tramos.reduce((s, t) => s + t.segundos, 0);
  let acumulado = 0;
  return tramos.map((t) => {
    const desde = acumulado / segundos;
    acumulado += t.segundos;
    return { desde, hasta: acumulado / segundos, proporcion: t.llegadas / llegadas };
  });
}

/** Pico que sigue a un cambio de clase: ocupa [cambio, cambio + 12,5 min]. */
export const FORMA_PICO_DESPUES = normalizar(TRAMOS_PICO_DESPUES);
/** Pico que precede a un cambio de clase: ocupa [cambio − 12,5 min, cambio]. */
export const FORMA_PICO_ANTES = normalizar(TRAMOS_PICO_ANTES);
