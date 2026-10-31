// Los resultados contados en palabras simples: frase principal, barras, pictograma, conclusión y
// frases de los tres indicadores. Sin React y con pruebas. Son las mismas cifras de la tabla.

import { coma } from './formato.ts';
import type { Indicadores } from './tabla.ts';

/** Hasta cuántos puntos de diferencia se dice que la simulación «se parece» a lo real. */
export const PUNTOS_PARECIDO = 3;
/** Cuántos puntos tiene que dar de menos una fórmula para decir que «se queda corta». */
export const PUNTOS_CORTA = 1;

/** Porcentaje (0 a 100) como entero de «cada 100»; nunca 100 si no es 100. */
export function decenasDeCien(pct: number): number {
  return Math.min(100, Math.max(0, Math.round(pct)));
}

/** «20,7»: el porcentaje exacto con coma decimal. */
export const pctExacto = (pct: number): string => coma(pct, 1);

export function frasePrincipal(ind: Indicadores): string | null {
  if (ind.simulacion === null) return null;
  const n = decenasDeCien(ind.simulacion);
  const cuantas = n === 0 ? 'casi ninguna' : n === 1 ? 'una' : `unas ${n}`;
  return ind.base === 'picos'
    ? `En la hora pico, de cada 100 personas que llegan al ascensor, ${cuantas} se van por las escaleras.`
    : `De cada 100 personas que llegan al ascensor, ${cuantas} se van por las escaleras.`;
}

/** Explica «picos» la primera vez que aparece. */
export const EXPLICACION_PICOS = 'La hora pico son los 12,5 minutos antes y después de cada cambio de clase.';

/** De 10 cabecitas, cuántas se marcan: el porcentaje entre 10, redondeado. */
export function cabezasQueSeVan(pct: number): number {
  return Math.min(10, Math.max(0, Math.round(pct / 10)));
}

export function textoAlternativoPictograma(pct: number): string {
  const n = cabezasQueSeVan(pct);
  if (n === 0) return 'Casi nadie se va por las escaleras: ninguna de cada 10 cabezas está marcada.';
  const resto = 10 - n;
  const marcadas = n === 1 ? '1 cabeza marcada con una escalera se va' : `${n} marcadas con una escalera se van`;
  const quedan = resto === 1 ? '1 espera' : `${resto} esperan`;
  return `${n} de cada 10 personas se van por las escaleras: ${quedan} y ${marcadas}.`;
}

export interface Barra {
  clave: 'real' | 'simulacion' | 'formulas';
  titulo: string;
  /** «21 de cada 100» */
  cada100: string;
  /** «20,7 %» */
  exacto: string;
  /** Ancho de la barra, 0 a 100 (de cada 100, a escala real). */
  ancho: number;
}

const barra = (clave: Barra['clave'], titulo: string, pct: number): Barra => ({
  clave,
  titulo,
  cada100: `${decenasDeCien(pct)} de cada 100`,
  exacto: `${pctExacto(pct)} %`,
  ancho: Math.min(100, Math.max(0, pct)),
});

/** Las barras en este orden; la de lo real solo existe con el caso del miércoles. */
export function barras(ind: Indicadores): Barra[] {
  const lista: Barra[] = [];
  if (ind.real !== null) lista.push(barra('real', 'Lo que pasó el miércoles (contado)', ind.real));
  if (ind.simulacion !== null) lista.push(barra('simulacion', 'Lo que da la simulación', ind.simulacion));
  if (ind.formulas !== null) lista.push(barra('formulas', 'Lo que dan las fórmulas de clase', ind.formulas));
  return lista;
}

const RAZON =
  'suponen que alguien se va solo cuando el sistema está lleno, pero el ascensor sube en tandas de hasta 10 y quien no cabe se va por las escaleras.';

/** La conclusión, escrita solo con lo que es verdad para estas cifras; si nada se puede afirmar, null. */
export function conclusion(ind: Indicadores): string | null {
  const { simulacion: s, formulas: f, real: r } = ind;
  if (s === null) return null;
  const partes: string[] = [];
  if (r !== null) {
    partes.push(
      Math.abs(s - r) <= PUNTOS_PARECIDO
        ? `La simulación se parece a lo que pasó el miércoles (${pctExacto(s)} % contra ${pctExacto(r)} %).`
        : `La simulación da ${pctExacto(s)} % y el miércoles se contó ${pctExacto(r)} %: no se parecen tanto.`,
    );
  }
  if (f !== null) {
    if (f < s - PUNTOS_CORTA && (r === null || f < r - PUNTOS_CORTA)) {
      partes.push(`Las fórmulas de clase se quedan cortas (${pctExacto(f)} %): ${RAZON}`);
    } else if (Math.abs(f - s) <= PUNTOS_CORTA) {
      partes.push(`Las fórmulas de clase dan una cifra parecida (${pctExacto(f)} %).`);
    }
  }
  return partes.length > 0 ? partes.join(' ') : null;
}

/** «1 min 4 s», «45 s», «2 min». Redondea a segundos. */
export function duracionTexto(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  if (total < 60) return `${total} s`;
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return seg === 0 ? `${min} min` : `${min} min ${seg} s`;
}

export interface FrasesIndicadores {
  fila: { antes: string; dato: string; despues: string } | null;
  espera: { antes: string; dato: string; despues: string } | null;
  vuelta: { antes: string; dato: string; despues: string } | null;
  /** Se usa cuando no hubo ninguna vuelta con fila llena. */
  sinVuelta: string;
}

/** Los tres indicadores pequeños como frases; el dato va aparte para ponerlo en negrita. */
export function frasesIndicadores(ind: Indicadores): FrasesIndicadores {
  const personas = ind.filaMaxima === null ? null : Math.round(ind.filaMaxima);
  return {
    fila: personas === null ? null : { antes: 'La fila llegó a tener ', dato: personas === 1 ? '1 persona' : `${personas} personas`, despues: '.' },
    espera: ind.esperaSeg === null ? null : { antes: 'Se esperó en promedio ', dato: duracionTexto(ind.esperaSeg), despues: '.' },
    vuelta: ind.vueltaSeg === null ? null : { antes: 'El ascensor tarda ', dato: duracionTexto(ind.vueltaSeg), despues: ' en subir y volver.' },
    sinVuelta: 'El ascensor no se llenó en ninguna vuelta, así que no se pudo medir cuánto tarda en subir y volver.',
  };
}

export const TEXTO_VACIO = 'Aún no hay resultados. Completa los pasos 1 a 3 (o carga el caso del miércoles) y pulsa Simular.';
export const TEXTO_SIMULANDO = 'Los resultados salen cuando terminan las 10 corridas.';
export const TEXTO_OBSOLETO =
  'Cambiaste los datos después de simular: estos resultados ya no corresponden a lo que está escrito. Pulsa Simular para actualizarlos.';

export interface Simbolo {
  /** Clave del símbolo; ver `Simbolo` en Subindice.tsx para dibujar los subíndices. */
  id: 'lambda' | 'mu' | 'rho' | 'L' | 'Lq' | 'W' | 'Wq' | 'PK' | 'lambdaEf' | 'pm';
  texto: string;
}

/** Una línea por símbolo de la tabla y qué es el ±. */
export const LEYENDA: readonly Simbolo[] = [
  { id: 'lambda', texto: 'personas que llegan por minuto.' },
  { id: 'mu', texto: 'personas que el ascensor sube por minuto cuando hay fila (medida en la simulación).' },
  { id: 'rho', texto: 'λ ÷ μ. Si pasa de 1, llega más gente de la que el ascensor puede subir.' },
  { id: 'L', texto: 'personas en el sistema (fila y cabina), en promedio.' },
  { id: 'Lq', texto: 'personas en la fila, en promedio.' },
  { id: 'W', texto: 'tiempo desde que llegan hasta que bajan.' },
  { id: 'Wq', texto: 'tiempo de espera en la fila.' },
  { id: 'PK', texto: 'probabilidad de que el sistema esté lleno (K = 11); en las fórmulas es el % que se va por las escaleras.' },
  { id: 'lambdaEf', texto: 'personas que sí entran al ascensor por minuto: λ(1 − P_K).' },
  { id: 'pm', texto: 'cuánto cambia la cifra de una corrida a otra (desviación entre las 10 corridas).' },
];
