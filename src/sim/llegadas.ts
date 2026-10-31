// Reparte a las personas en el tiempo: picos junto a los cambios de clase y valle en el resto.

import { PARAMETROS as P } from '../data/parametros.ts';
import { cambiosEnFranja } from '../data/horario.ts';
import { FORMA_PICO_ANTES, FORMA_PICO_DESPUES } from '../data/formaPicos.ts';
import { barajar, crearRng, elegirPonderado, type Rng } from './rng.ts';
import type { Entradas, Escenario, Persona, TipoPersona } from './tipos.ts';

type Ventana = [number, number];

export function validarEntradas(e: Entradas): void {
  const enteros: (keyof Entradas)[] = ['llegadasP1', 'bajan', 'sillas', 'muletas', 'usosAseo'];
  for (const k of enteros) {
    if (!Number.isInteger(e[k]) || e[k] < 0) throw new RangeError(`${k} debe ser un entero mayor o igual a 0`);
  }
  if (!Number.isFinite(e.horaInicioMin) || e.horaInicioMin < 0) throw new RangeError('horaInicioMin inválida');
  if (!Number.isFinite(e.duracionMin) || e.duracionMin <= 0) throw new RangeError('duracionMin debe ser mayor que 0');
  if (e.sillas + e.muletas > e.llegadasP1) {
    throw new RangeError('Las sillas y muletas se cuentan dentro de las llegadas a P1');
  }
}

function unir(ventanas: Ventana[]): Ventana[] {
  const orden = [...ventanas].sort((a, b) => a[0] - b[0]);
  const res: Ventana[] = [];
  for (const v of orden) {
    const ultima = res[res.length - 1];
    if (ultima && v[0] <= ultima[1]) ultima[1] = Math.max(ultima[1], v[1]);
    else res.push([v[0], v[1]]);
  }
  return res;
}

function complemento(ventanas: Ventana[], T: number): Ventana[] {
  const res: Ventana[] = [];
  let cursor = 0;
  for (const [a, b] of ventanas) {
    if (a > cursor) res.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < T) res.push([cursor, T]);
  return res;
}

interface Segmento {
  a: number;
  b: number;
  /** Parte de las llegadas de picos que le toca (un pico completo vale 1). */
  peso: number;
}

/**
 * Tramos de los picos dentro de la franja. Cada cambio de clase tiene un pico antes (forma del pico 2
 * del miércoles) y otro después (forma del pico 1), de 12,5 min; lo que sale de la franja se recorta
 * y su peso baja en proporción.
 */
function segmentosDePico(cambios: number[], T: number): Segmento[] {
  const W = P.picoSegundos;
  const res: Segmento[] = [];
  for (const o of cambios) {
    for (const [inicio, forma] of [[o - W, FORMA_PICO_ANTES], [o, FORMA_PICO_DESPUES]] as const) {
      for (const tr of forma) {
        const a = Math.max(0, inicio + tr.desde * W);
        const b = Math.min(T, inicio + tr.hasta * W);
        if (b <= a) continue;
        res.push({ a, b, peso: (tr.proporcion * (b - a)) / ((tr.hasta - tr.desde) * W) });
      }
    }
  }
  return res;
}

/** Reparte `total` en enteros proporcionales a `pesos` (mayor resto). */
export function repartir(total: number, pesos: number[]): number[] {
  const suma = pesos.reduce((s, p) => s + p, 0);
  if (suma <= 0) return pesos.map(() => 0);
  const exactos = pesos.map((p) => (total * p) / suma);
  const base = exactos.map(Math.floor);
  let faltan = total - base.reduce((s, x) => s + x, 0);
  const orden = exactos.map((x, i) => [x - Math.floor(x), i] as const).sort((p, q) => q[0] - p[0] || p[1] - q[1]);
  for (const [, i] of orden) {
    if (faltan <= 0) break;
    base[i]++;
    faltan--;
  }
  return base;
}

const largo = (vs: Ventana[]) => vs.reduce((s, [a, b]) => s + (b - a), 0);

/** Segundo entero uniforme dentro de la unión de ventanas. */
function muestrear(rng: Rng, vs: Ventana[], T: number): number {
  let u = rng() * largo(vs);
  for (const [a, b] of vs) {
    if (u < b - a) return Math.min(T - 1, Math.floor(a + u));
    u -= b - a;
  }
  return Math.min(T - 1, Math.floor(vs[vs.length - 1][1] - 1));
}

const dentro = (vs: Ventana[], t: number) => vs.some(([a, b]) => t >= a && t < b);

export interface OpcionesEscenario {
  /**
   * Tamaño promedio de los grupos que llegan juntos a P1 y suben al mismo piso (una clase).
   * 1 = cada persona llega y elige destino por separado (valor por defecto).
   */
  tamanoGrupo?: number;
}

interface Reparto {
  T: number;
  cambios: number[];
  picos: Ventana[];
  valle: Ventana[];
  /** Quienes ya esperaban al comenzar (solo si la franja empieza en un cambio de clase). */
  inicial: number;
  /** Llegadas que caen dentro de los picos (sin las iniciales). */
  enPicos: number;
  /** Llegadas que no son iniciales. */
  resto: number;
}

/**
 * Cómo se reparten las llegadas entre picos y valle. Sin ningún cambio de clase en la franja no hay
 * picos: todas las llegadas son de valle y se reparten parejo en toda la franja.
 */
function repartoBase(entradas: Entradas): Reparto {
  const T = Math.round(entradas.duracionMin * 60);
  const cambios = cambiosEnFranja(entradas.horaInicioMin, entradas.duracionMin).map(
    (c) => Math.round((c - entradas.horaInicioMin) * 60),
  );
  const picos = unir(cambios.map((o) => [Math.max(0, o - P.picoSegundos), Math.min(T, o + P.picoSegundos)] as Ventana));
  const valle = complemento(picos, T);

  const N = entradas.llegadasP1;
  const inicial = cambios.includes(0)
    ? Math.min(N, Math.round((N * P.esperabanAlInicio.esperaban) / P.esperabanAlInicio.de))
    : 0;
  const resto = N - inicial;

  // 88 % de las demás en los picos, el resto en el valle.
  let enPicos: number;
  if (largo(picos) === 0) enPicos = 0;
  else if (largo(valle) === 0) enPicos = resto;
  else enPicos = Math.round(resto * P.fraccionEnPicos);
  return { T, cambios, picos, valle, inicial, enPicos, resto };
}

/**
 * Personas por minuto que se esperan dentro de los picos (promedio de todas las ventanas de pico),
 * o null si la franja no tiene picos. No usa el generador: es la cuenta del reparto.
 */
export function tasaEsperadaPicos(entradas: Entradas): number | null {
  const { picos, enPicos } = repartoBase(entradas);
  const segundos = largo(picos);
  return segundos > 0 ? enPicos / (segundos / 60) : null;
}

export function generarEscenario(entradas: Entradas, semilla: number, opciones: OpcionesEscenario = {}): Escenario {
  validarEntradas(entradas);
  const rng = crearRng(semilla);
  const { T, cambios, picos, valle, inicial, enPicos, resto } = repartoBase(entradas);
  const todo: Ventana[] = [[0, T]];
  const N = entradas.llegadasP1;
  const tiempos: number[] = [];
  const segmentos = segmentosDePico(cambios, T);
  const porSegmento = repartir(enPicos, segmentos.map((s) => s.peso));
  segmentos.forEach((s, k) => {
    for (let i = 0; i < porSegmento[k]; i++) tiempos.push(muestrear(rng, [[s.a, s.b]], T));
  });
  const ventanasValle = largo(valle) > 0 ? valle : todo;
  for (let i = enPicos; i < resto; i++) tiempos.push(muestrear(rng, ventanasValle, T));
  tiempos.sort((a, b) => a - b);

  // Sillas y muletas ocupan al azar algunas de esas llegadas (o de las iniciales si no alcanzan).
  const tipos: TipoPersona[] = [
    ...Array<TipoPersona>(entradas.sillas).fill('silla'),
    ...Array<TipoPersona>(entradas.muletas).fill('muletas'),
  ];
  const posiciones = barajar(rng, Array.from({ length: N }, (_, i) => i)); // 0..inicial-1 son las iniciales
  const tipoDe = new Map<number, TipoPersona>();
  const candidatas = [...posiciones.filter((i) => i >= inicial), ...posiciones.filter((i) => i < inicial)];
  tipos.forEach((t, i) => tipoDe.set(candidatas[i], t));

  // Grupos: personas consecutivas que llegan juntas y comparten destino (una clase que sube).
  const grupo = Math.max(1, Math.round(opciones.tamanoGrupo ?? 1));
  const primeroDelGrupo: number[] = [];
  let inicioGrupo = 0;
  let faltanDelGrupo = 0;
  for (let i = 0; i < N; i++) {
    if (faltanDelGrupo === 0 || i === inicial) {
      inicioGrupo = i;
      faltanDelGrupo = grupo > 1 ? 1 + Math.floor(rng() * (2 * grupo - 1)) : 1; // de 1 a 2·grupo−1, promedio = grupo
    }
    faltanDelGrupo--;
    primeroDelGrupo.push(inicioGrupo);
  }
  const destinoDelGrupo = new Map<number, number>();

  const personas: Omit<Persona, 'id'>[] = [];
  for (let i = 0; i < N; i++) {
    const esInicial = i < inicial;
    const lider = primeroDelGrupo[i];
    const llegada = esInicial ? 0 : tiempos[lider - inicial];
    const tipo = tipoDe.get(i) ?? 'normal';
    if (i === lider) destinoDelGrupo.set(lider, elegirPonderado(rng, P.destinosSubida).piso);
    personas.push({
      tipo,
      cupos: tipo === 'silla' ? P.cuposSilla : tipo === 'muletas' ? P.cuposMuletas : 1,
      origen: 1,
      destino: destinoDelGrupo.get(lider) as number,
      llegada,
      inicial: esInicial,
      enPico: esInicial || dentro(picos, llegada),
      abordo: null,
      bajo: null,
      seFue: false,
    });
  }

  // Quienes bajan tras un cambio de clase (los que ocurren dentro de la franja, sin contar el final).
  const cambiosQueSueltan = cambios.filter((o) => o < T);
  for (let i = 0; i < entradas.bajan; i++) {
    let llegada: number;
    if (cambiosQueSueltan.length > 0) {
      const o = cambiosQueSueltan[i % cambiosQueSueltan.length];
      llegada = Math.min(T - 1, o + Math.floor(rng() * P.picoSegundos));
    } else {
      llegada = Math.floor(rng() * T); // sin cambio de clase en la franja: se reparten parejo
    }
    personas.push({
      tipo: 'normal',
      cupos: 1,
      origen: elegirPonderado(rng, P.origenesBajada).piso,
      destino: elegirPonderado(rng, P.destinosBajada).piso,
      llegada,
      inicial: false,
      enPico: false,
      abordo: null,
      bajo: null,
      seFue: false,
    });
  }

  personas.sort((a, b) => a.llegada - b.llegada);
  const solicitudesAseo = Array.from({ length: entradas.usosAseo }, (_, i) =>
    Math.floor(((i + 0.5) / entradas.usosAseo) * T),
  );

  return {
    duracionS: T,
    personas: personas.map((p, id) => ({ ...p, id })),
    solicitudesAseo,
    ventanasPico: picos,
  };
}
