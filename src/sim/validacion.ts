// Validación de las 7 entradas del formulario. Recibe el texto tal como se escribió y devuelve
// las entradas ya convertidas, o un mensaje claro por campo. Los rangos están en `data/rangos.ts`.

import { RANGOS, INICIO_MIN_MIN, INICIO_MAX_MIN, FIN_MAX_MIN, MU_AVISO_POR_MIN } from '../data/rangos.ts';
import { formatoHora } from '../data/horario.ts';
import { tasaEsperadaPicos } from './llegadas.ts';
import type { Entradas } from './tipos.ts';

export type Campo = 'horaInicio' | 'duracion' | 'llegadasP1' | 'bajan' | 'sillas' | 'muletas' | 'usosAseo';

export type EntradasTexto = Record<Campo, string>;
export type Errores = Partial<Record<Campo, string>>;

export type ResultadoValidacion =
  | { ok: true; entradas: Entradas; avisos: string[] }
  | { ok: false; errores: Errores };

const coma = (n: number, decimales = 1) => n.toFixed(decimales).replace('.', ',');

/** Hora de 24 h, «H:MM» o «HH:MM». Devuelve minutos desde la medianoche o un mensaje. */
export function leerHora(texto: string): { minutos: number } | { error: string } {
  const t = texto.trim();
  const ejemplo = 'Escribe la hora en formato de 24 horas, por ejemplo 12:40.';
  if (t === '') return { error: ejemplo };
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return { error: ejemplo };
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return { error: `${t} no es una hora válida. ${ejemplo}` };
  return { minutos: h * 60 + min };
}

/**
 * Entero ≥ 0 escrito como texto. Acepta coma o punto solo para poder decir que no van decimales.
 * `5,0` y `5.5` se rechazan.
 */
export function leerEntero(texto: string, min: number, max: number): { valor: number } | { error: string } {
  const t = texto.trim();
  const pedido = `Escribe un número entero entre ${min} y ${max}.`;
  if (t === '') return { error: `Este campo está vacío. ${pedido}` };
  if (/^-/.test(t)) return { error: `No puede ser negativo. ${pedido}` };
  if (/^\d+[.,]\d*$|^[.,]\d+$/.test(t)) return { error: `Escribe un número entero, sin decimales. ${pedido}` };
  if (!/^\d+$/.test(t)) return { error: `Solo se aceptan cifras (0 a 9). ${pedido}` };
  const valor = Number(t);
  if (!Number.isSafeInteger(valor) || valor < min || valor > max) {
    return { error: `${valor > max || !Number.isSafeInteger(valor) ? 'Es demasiado grande' : 'Es demasiado pequeño'}. ${pedido}` };
  }
  return { valor };
}

export function validar(texto: EntradasTexto): ResultadoValidacion {
  const errores: Errores = {};
  const num: Partial<Record<Campo, number>> = {};

  const hora = leerHora(texto.horaInicio);
  let inicio: number | null = null;
  if ('error' in hora) errores.horaInicio = hora.error;
  else if (hora.minutos < INICIO_MIN_MIN || hora.minutos > INICIO_MAX_MIN) {
    errores.horaInicio = `El horario de clases va de ${formatoHora(INICIO_MIN_MIN)} a ${formatoHora(FIN_MAX_MIN)}. Escribe una hora de inicio entre ${formatoHora(INICIO_MIN_MIN)} y ${formatoHora(INICIO_MAX_MIN)}.`;
  } else inicio = hora.minutos;

  // La duración máxima depende de la hora de inicio cuando esta es válida.
  const topeDuracion = inicio === null ? RANGOS.duracionMin.max : Math.min(RANGOS.duracionMin.max, FIN_MAX_MIN - inicio);
  const dur = leerEntero(texto.duracion, RANGOS.duracionMin.min, Math.max(topeDuracion, RANGOS.duracionMin.min));
  if ('error' in dur) {
    if (inicio !== null && topeDuracion < RANGOS.duracionMin.max && /grande/.test(dur.error)) {
      errores.duracion = `Con inicio a las ${formatoHora(inicio)}, la duración máxima es ${topeDuracion} min.`;
    } else errores.duracion = dur.error;
  } else num.duracion = dur.valor;

  for (const campo of ['llegadasP1', 'bajan', 'sillas', 'muletas', 'usosAseo'] as const) {
    const r = RANGOS[campo];
    const v = leerEntero(texto[campo], r.min, r.max);
    if ('error' in v) errores[campo] = v.error;
    else num[campo] = v.valor;
  }

  // Las sillas y las muletas se cuentan dentro de las personas que llegan a P1.
  const llegadas = num.llegadasP1;
  if (llegadas !== undefined) {
    if (num.sillas !== undefined && num.sillas > llegadas) {
      errores.sillas = `Las sillas de ruedas se cuentan dentro de las personas que llegan a P1 (${llegadas}). Escribe ${llegadas} o menos.`;
    } else if (num.muletas !== undefined && num.muletas > llegadas - (num.sillas ?? 0)) {
      errores.muletas = `Las muletas se cuentan dentro de las personas que llegan a P1, junto con las sillas. Escribe ${llegadas - (num.sillas ?? 0)} o menos.`;
    }
  }

  if (Object.keys(errores).length > 0 || inicio === null) return { ok: false, errores };

  const entradas: Entradas = {
    horaInicioMin: inicio,
    duracionMin: num.duracion as number,
    llegadasP1: num.llegadasP1 as number,
    bajan: num.bajan as number,
    sillas: num.sillas as number,
    muletas: num.muletas as number,
    usosAseo: num.usosAseo as number,
  };
  return { ok: true, entradas, avisos: avisosDe(entradas) };
}

/** Avisos que no bloquean. */
export function avisosDe(entradas: Entradas): string[] {
  const avisos: string[] = [];
  const tasa = tasaEsperadaPicos(entradas);
  if (tasa !== null && tasa > MU_AVISO_POR_MIN) {
    avisos.push(
      `En los picos se esperan unas ${coma(tasa)} personas por minuto y el ascensor mueve, en promedio, unas ${coma(MU_AVISO_POR_MIN)}: muchas se irán por las escaleras.`,
    );
  }
  return avisos;
}
