// De la traza de la corrida 1 al estado de la escena en cualquier segundo simulado.
//
// `construirIndice` ordena la traza una sola vez. `estadoEn(indice, t)` y `indicadoresEn(indice, t)` son funciones
// puras de `t`: no guardan nada entre una llamada y la siguiente. Por eso pausar congela todo (el tiempo no avanza y
// el estado no cambia) y un salto del reloj (reiniciar, mover la barra, volver a la pestaña) coloca todo de una vez.
// Cada llamada cuesta lo mismo sin importar cuántas personas haya en las filas: se buscan con búsqueda binaria y
// solo se arman las primeras MAX_POR_PISO de cada piso.

import { PARAMETROS as P } from '../data/parametros.ts';
import type { TipoPersona, Traza } from '../sim/tipos.ts';
import { desvio, lugarEnCabina, lugarEnFila } from './disposicion.ts';
import { CABINA, DECORACION, PARED_IZQUIERDA_Z, PISO_MAXIMO, TORRE, yPiso } from './medidas.ts';
import type { CabinaVista, EstadoVista, PersonaVista } from './vista.ts';

/** Personas que se dibujan como máximo en la fila de cada piso (de las demás solo se sabe cuántas son). */
export const MAX_POR_PISO = 12;

// Duraciones de los trayectos a pie, en segundos simulados. La velocidad sale de la distancia: quien está lejos
// camina más rápido, pero todos llegan a tiempo.
export const LLEGADA_S = 3;
export const EMBARQUE_S = 2.2;
export const SALIDA_S = 4.5;
export const ESCALERAS_S = 3.5;
export const ASEO_ENTRADA_S = 3;
/** Lo que tarda quien está en una fila en dar el paso adelante cuando alguien de adelante se va. */
export const PASO_FILA_S = 1;
/** El personal de aseo llega al vestíbulo de P1 un rato antes de subir. */
export const ANTELACION_ASEO_S = 2.5;
/** Metros de escena por ciclo completo del paso. */
const ZANCADA = 0.9;
const ENTRADA_X = -4;
const SALIDA_X = -4;
const X_PUERTA = TORRE.xPuertas - 0.45;
const X_ASEO_SOTANO = 2.2;
const LUGARES_CABINA = 12;
const EPS = 1e-4;

export interface DatosPersona {
  id: number;
  tipo: TipoPersona;
  origen: number;
  destino: number;
  cupos: number;
  llegada: number;
  tSube: number | null;
  tBaja: number | null;
  tEscaleras: number | null;
  /** Solo el aseo: cuando termina en el sótano. */
  tTermina: number | null;
  /** Lugar que ocupa dentro de la cabina (se asigna al subir). */
  lugar: number;
  /** Segundo en que deja la fila: sube o se va por las escaleras (Infinity si no). */
  salidaFila: number;
  aseo: boolean;
}

interface Movimiento {
  t: number;
  llega: number;
  desde: number;
  hacia: number;
}
interface EventoPuerta {
  t: number;
  tipo: 'abre' | 'abierta' | 'cierra' | 'cerrada';
}
interface Cambio {
  t: number;
  /** Quienes van a bordo después de este cambio. */
  abordo: DatosPersona[];
  cupos: number;
}
interface FilaPiso {
  /** Todas las que pasan por este piso, por orden de llegada. */
  personas: DatosPersona[];
  llegadas: Float64Array;
  salidas: Float64Array;
  /** Máximo de `salidas` hasta cada posición (no decrece: sirve para buscar con búsqueda binaria). */
  maximoSalida: Float64Array;
  salidasOrdenadas: Float64Array;
  /** Para contar la fila sin el personal de aseo. */
  llegadasContadas: Float64Array;
  salidasContadas: Float64Array;
}

export interface Indice {
  traza: Traza;
  /** Segundo en que termina la corrida. */
  fin: number;
  filas: FilaPiso[];
  movimientos: Movimiento[];
  tiemposMovimientos: Float64Array;
  puertas: EventoPuerta[];
  tiemposPuertas: Float64Array;
  cambios: Cambio[];
  tiemposCambios: Float64Array;
  /** Quienes bajan (con su segundo), por orden de bajada. */
  bajas: DatosPersona[];
  tiemposBajas: Float64Array;
  escaleras: DatosPersona[];
  tiemposEscaleras: Float64Array;
  usosAseo: DatosPersona[];
}

// ---------------------------------------------------------------- búsqueda binaria

/** Cantidad de elementos de `a` (ordenado) que son ≤ x. */
function hasta(a: Float64Array, x: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (a[m] <= x) lo = m + 1;
    else hi = m;
  }
  return lo;
}

/** Posición del primer elemento de `a` (no decreciente) que es > x. */
const primeroMayor = hasta;

// ---------------------------------------------------------------- índice

function datos(p: Traza['personas'][number]): DatosPersona {
  return {
    id: p.id, tipo: p.tipo, origen: p.origen, destino: p.destino, cupos: p.cupos, llegada: p.llegada,
    tSube: null, tBaja: null, tEscaleras: null, tTermina: null, lugar: 0, salidaFila: Infinity, aseo: p.tipo === 'aseo',
  };
}

const ordenados = (xs: number[]) => Float64Array.from(xs).sort();

export function construirIndice(traza: Traza): Indice {
  const normales = new Map<number, DatosPersona>();
  const todas: DatosPersona[] = [];
  for (const p of traza.personas) {
    if (p.id < 0) continue;
    const d = datos(p);
    normales.set(p.id, d);
    todas.push(d);
  }
  const usosAseo: DatosPersona[] = [];
  let usoABordo: DatosPersona | null = null;
  const libres = Array.from({ length: LUGARES_CABINA }, (_, i) => i);
  const abordo: DatosPersona[] = [];
  const cambios: Cambio[] = [];
  const movimientos: Movimiento[] = [];
  const puertas: EventoPuerta[] = [];
  const escaleras: DatosPersona[] = [];

  const registrarCambio = (t: number) =>
    cambios.push({ t, abordo: abordo.slice(), cupos: abordo.reduce((s, p) => s + p.cupos, 0) });

  for (const e of traza.eventos) {
    switch (e.tipo) {
      case 'mueve':
        movimientos.push({ t: e.t, llega: e.llega, desde: e.desde, hacia: e.hacia });
        break;
      case 'abre':
      case 'abierta':
      case 'cierra':
      case 'cerrada':
        puertas.push({ t: e.t, tipo: e.tipo });
        break;
      case 'sube': {
        let d = normales.get(e.persona);
        if (e.persona === -1) {
          // Cada uso del ascensor por el aseo es una persona aparte, para no confundir un viaje con otro.
          d = datos({ id: -(usosAseo.length + 1), tipo: 'aseo', cupos: 1, origen: 1, destino: 0, llegada: Math.max(0, e.t - ANTELACION_ASEO_S) });
          usosAseo.push(d);
          todas.push(d);
          usoABordo = d;
        }
        if (!d) break;
        d.tSube = e.t;
        d.salidaFila = e.t;
        d.lugar = libres.shift() ?? 0;
        abordo.push(d);
        registrarCambio(e.t);
        break;
      }
      case 'baja': {
        const d = e.persona === -1 ? usoABordo : normales.get(e.persona);
        if (!d) break;
        d.tBaja = e.t;
        libres.push(d.lugar);
        libres.sort((a, b) => a - b);
        abordo.splice(abordo.indexOf(d), 1);
        registrarCambio(e.t);
        break;
      }
      case 'escaleras': {
        const d = normales.get(e.persona);
        if (!d) break;
        d.tEscaleras = e.t;
        d.salidaFila = e.t;
        escaleras.push(d);
        break;
      }
      case 'aseoTermina': {
        const uso = usosAseo.find((u) => u.tBaja !== null && u.tTermina === null);
        if (uso) uso.tTermina = e.t;
        break;
      }
    }
  }

  const filas: FilaPiso[] = Array.from({ length: PISO_MAXIMO + 1 }, (): FilaPiso => ({
    personas: [], llegadas: new Float64Array(0), salidas: new Float64Array(0), maximoSalida: new Float64Array(0),
    salidasOrdenadas: new Float64Array(0), llegadasContadas: new Float64Array(0), salidasContadas: new Float64Array(0),
  }));
  const porPiso: DatosPersona[][] = filas.map(() => []);
  for (const d of todas) if (d.origen >= 0 && d.origen <= PISO_MAXIMO) porPiso[d.origen].push(d);
  porPiso.forEach((lista, piso) => {
    lista.sort((a, b) => a.llegada - b.llegada || a.id - b.id);
    const f = filas[piso];
    f.personas = lista;
    f.llegadas = Float64Array.from(lista, (p) => p.llegada);
    f.salidas = Float64Array.from(lista, (p) => p.salidaFila);
    const maximo = new Float64Array(lista.length);
    let m = -Infinity;
    for (let i = 0; i < lista.length; i++) {
      m = Math.max(m, f.salidas[i]);
      maximo[i] = m;
    }
    f.maximoSalida = maximo;
    f.salidasOrdenadas = ordenados(lista.map((p) => p.salidaFila).filter(Number.isFinite));
    const contadas = lista.filter((p) => !p.aseo);
    f.llegadasContadas = ordenados(contadas.map((p) => p.llegada));
    f.salidasContadas = ordenados(contadas.map((p) => p.salidaFila).filter(Number.isFinite));
  });

  const bajas = todas.filter((p) => p.tBaja !== null).sort((a, b) => (a.tBaja as number) - (b.tBaja as number));
  escaleras.sort((a, b) => (a.tEscaleras as number) - (b.tEscaleras as number));

  return {
    traza,
    fin: traza.finS,
    filas,
    movimientos,
    tiemposMovimientos: Float64Array.from(movimientos, (m) => m.t),
    puertas,
    tiemposPuertas: Float64Array.from(puertas, (p) => p.t),
    cambios,
    tiemposCambios: Float64Array.from(cambios, (c) => c.t),
    bajas,
    tiemposBajas: Float64Array.from(bajas, (p) => p.tBaja as number),
    escaleras,
    tiemposEscaleras: Float64Array.from(escaleras, (p) => p.tEscaleras as number),
    usosAseo,
  };
}

// ---------------------------------------------------------------- cabina y puertas

const suave = (u: number) => {
  const x = Math.min(1, Math.max(0, u));
  return x * x * (3 - 2 * x);
};

export function cabinaEn(ix: Indice, t: number): CabinaVista {
  let piso = 1;
  let sentido: -1 | 0 | 1 = 0;
  const m = hasta(ix.tiemposMovimientos, t) - 1;
  if (m >= 0) {
    const mov = ix.movimientos[m];
    if (t < mov.llega) {
      const u = (t - mov.t) / (mov.llega - mov.t);
      piso = mov.desde + (mov.hacia - mov.desde) * u;
      sentido = mov.hacia > mov.desde ? 1 : -1;
    } else {
      piso = mov.hacia;
    }
  }
  let puertas = 0;
  const k = hasta(ix.tiemposPuertas, t) - 1;
  if (k >= 0) {
    const ev = ix.puertas[k];
    if (ev.tipo === 'abre') puertas = suave((t - ev.t) / P.tiempos.abrir);
    else if (ev.tipo === 'abierta') puertas = 1;
    else if (ev.tipo === 'cierra') puertas = 1 - suave((t - ev.t) / P.tiempos.cerrar);
  }
  return { piso, puertas, sentido };
}

// ---------------------------------------------------------------- trayectos

type Punto = readonly [number, number];

function mezclarGiro(a: number, b: number, k: number): number {
  let d = b - a;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return a + d * k;
}

function persona(p: DatosPersona, x: number, y: number, z: number, giro: number, caminando: boolean, ciclos: number): PersonaVista {
  return { id: p.id, tipo: p.tipo, x, y, z, giro, caminando, ciclos };
}

const cicloQuieto = (p: DatosPersona) => desvio(p.id, 7) + 0.5;

function quieto(p: DatosPersona, x: number, y: number, z: number, giro: number): PersonaVista {
  return persona(p, x, y, z, giro, false, cicloQuieto(p));
}

/**
 * Persona que recorre una línea quebrada a paso parejo; `u` va de 0 a 1. Al final del camino gira hacia
 * `giroFinal` (hacia donde mira quien llega).
 */
function andando(p: DatosPersona, y: number, puntos: readonly Punto[], u: number, giroFinal: number | null): PersonaVista {
  const uu = Math.min(1, Math.max(0, u));
  const largos: number[] = [];
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const l = Math.hypot(puntos[i][0] - puntos[i - 1][0], puntos[i][1] - puntos[i - 1][1]);
    largos.push(l);
    total += l;
  }
  const fin = puntos[puntos.length - 1];
  if (total < 1e-6) return quieto(p, fin[0], y, fin[1], giroFinal ?? Math.PI / 2);
  let recorrido = uu * total;
  const hecho = recorrido;
  let i = 0;
  while (i < largos.length - 1 && recorrido > largos[i]) {
    recorrido -= largos[i];
    i++;
  }
  const f = largos[i] > 0 ? recorrido / largos[i] : 1;
  const x = puntos[i][0] + (puntos[i + 1][0] - puntos[i][0]) * f;
  const z = puntos[i][1] + (puntos[i + 1][1] - puntos[i][1]) * f;
  const rumbo = Math.atan2(puntos[i + 1][0] - puntos[i][0], puntos[i + 1][1] - puntos[i][1]);
  const giro = giroFinal === null ? rumbo : mezclarGiro(rumbo, giroFinal, suave((uu - 0.8) / 0.2));
  return persona(p, x, y, z, giro, uu < 1, hecho / ZANCADA);
}

const puntoEntrada = (p: DatosPersona): Punto => [ENTRADA_X, TORRE.zc + desvio(p.id, 5) * 1.4];
const puntoSalida = (p: DatosPersona): Punto => [SALIDA_X, TORRE.zc + desvio(p.id, 6) * 1.4];
const puntoLateral = (p: DatosPersona): Punto => [0.6, TORRE.zc + desvio(p.id, 6) * 1.1];
const PUERTA: Punto = [X_PUERTA, TORRE.zc];

// ---------------------------------------------------------------- filas

/** Las primeras `max` personas de la fila de un piso en el segundo `t`, por orden. */
function ventana(f: FilaPiso, t: number, max: number): DatosPersona[] {
  const n = f.personas.length;
  // Primera persona con alguien que sigue en la fila a partir de ella: el máximo acumulado no decrece.
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (f.maximoSalida[m] > t) hi = m;
    else lo = m + 1;
  }
  const res: DatosPersona[] = [];
  for (let i = lo; i < n && f.llegadas[i] <= t && res.length < max; i++) {
    if (f.salidas[i] > t) res.push(f.personas[i]);
  }
  return res;
}

/** Último segundo ≤ t en que alguien dejó la fila de este piso (−Infinity si nadie). */
function ultimaSalida(f: FilaPiso, t: number): number {
  const k = hasta(f.salidasOrdenadas, t);
  return k === 0 ? -Infinity : f.salidasOrdenadas[k - 1];
}

function poseFila(p: DatosPersona, rango: number, rangoAntes: number | undefined, ultima: number, t: number): PersonaVista {
  const y = yPiso(p.origen);
  const destino = lugarEnFila(rango, p.id);
  const desdeLlegar = t - p.llegada;
  if (desdeLlegar < LLEGADA_S) {
    return andando(p, y, [puntoEntrada(p), [destino.x, destino.z]], desdeLlegar / LLEGADA_S, destino.giro);
  }
  if (rangoAntes !== undefined && rangoAntes !== rango) {
    const s = (t - ultima) / PASO_FILA_S;
    if (s < 1) {
      const origen = lugarEnFila(rangoAntes, p.id);
      return andando(p, y, [[origen.x, origen.z], [destino.x, destino.z]], s, destino.giro);
    }
  }
  return quieto(p, destino.x, y, destino.z, destino.giro);
}

/**
 * Dónde está una persona en la fila en un segundo dado. Si no está entre las primeras MAX_POR_PISO (no se dibujaba),
 * devuelve null, salvo que `aunSinVerse` pida ponerla al final de las que se ven (quien sube a la cabina desde atrás).
 */
function poseFilaEn(ix: Indice, p: DatosPersona, t: number, aunSinVerse: boolean): PersonaVista | null {
  const f = ix.filas[p.origen];
  const ahora = ventana(f, t, MAX_POR_PISO);
  const lugar = ahora.findIndex((q) => q.id === p.id);
  if (lugar < 0 && !aunSinVerse) return null;
  const antes = ventana(f, t - PASO_FILA_S, MAX_POR_PISO).findIndex((q) => q.id === p.id);
  return poseFila(p, lugar < 0 ? MAX_POR_PISO : lugar, antes < 0 ? undefined : antes, ultimaSalida(f, t), t);
}

// ---------------------------------------------------------------- estado en un segundo

/** Dónde queda en el mundo el lugar de una persona dentro de la cabina, que está a la altura `y`. */
const lugarDeCabina = (p: DatosPersona, y: number): readonly [number, number, number] => {
  const l = lugarEnCabina(Math.min(p.lugar, LUGARES_CABINA - 1));
  return [CABINA.xCentro + l.x, y, TORRE.zc + l.z];
};

export function estadoEn(ix: Indice, t: number): EstadoVista {
  const cabina = cabinaEn(ix, t);
  const personas: PersonaVista[] = [];
  const yCabina = yPiso(cabina.piso) + 0.02;

  // 1. Quienes esperan en cada piso (solo las primeras de la fila).
  for (let piso = 0; piso <= PISO_MAXIMO; piso++) {
    const f = ix.filas[piso];
    if (f.personas.length === 0) continue;
    const ahora = ventana(f, t, MAX_POR_PISO);
    if (ahora.length === 0) continue;
    const antes = new Map(ventana(f, t - PASO_FILA_S, MAX_POR_PISO).map((p, i) => [p.id, i]));
    const ultima = ultimaSalida(f, t);
    ahora.forEach((p, rango) => personas.push(poseFila(p, rango, antes.get(p.id), ultima, t)));
  }

  // 2. Quienes van a bordo: entrando (a pie hasta su lugar) o ya en su lugar.
  const c = hasta(ix.tiemposCambios, t) - 1;
  if (c >= 0) {
    for (const q of ix.cambios[c].abordo) {
      const tSube = q.tSube as number;
      if (t < tSube + EMBARQUE_S) {
        const inicio = poseFilaEn(ix, q, tSube - EPS, true) as PersonaVista;
        const [cx, , cz] = lugarDeCabina(q, 0);
        const u = (t - tSube) / EMBARQUE_S;
        const e = andando(q, yPiso(q.origen) + 0.02 * suave(u), [[inicio.x, inicio.z], PUERTA, [cx, cz]], u, -Math.PI / 2);
        personas.push(e);
      } else {
        const [x, y, z] = lugarDeCabina(q, yCabina);
        personas.push(quieto(q, x, y, z, -Math.PI / 2));
      }
    }
  }

  // 3. Quienes acaban de bajar y se van caminando por el vestíbulo y el pasillo.
  for (let i = primeroMayor(ix.tiemposBajas, t - SALIDA_S); i < ix.bajas.length && ix.tiemposBajas[i] <= t; i++) {
    const q = ix.bajas[i];
    if (q.aseo) continue;
    const tBaja = q.tBaja as number;
    const [cx, , cz] = lugarDeCabina(q, 0);
    const u = (t - tBaja) / SALIDA_S;
    personas.push(andando(q, yPiso(q.destino) + 0.02 * (1 - suave(u)), [[cx, cz], PUERTA, puntoLateral(q), puntoSalida(q)], u, null));
  }

  // 4. Quienes no cupieron en P1 y se van por las escaleras: caminan hasta la puerta de las escaleras y desaparecen.
  for (let i = primeroMayor(ix.tiemposEscaleras, t - ESCALERAS_S); i < ix.escaleras.length && ix.tiemposEscaleras[i] <= t; i++) {
    const q = ix.escaleras[i];
    const tE = q.tEscaleras as number;
    // Solo se dibujan quienes estaban entre los primeros de la fila; de los demás solo cuenta el rótulo con el total.
    const inicio = poseFilaEn(ix, q, tE - EPS, false);
    if (!inicio) continue;
    const puerta: Punto = [DECORACION.escaleras.x, PARED_IZQUIERDA_Z + 0.2];
    personas.push(andando(q, yPiso(1), [[inicio.x, inicio.z], puerta], (t - tE) / ESCALERAS_S, null));
  }

  // 5. El personal de aseo en el sótano: baja, espera y se va.
  for (const q of ix.usosAseo) {
    if (q.tBaja === null || t < q.tBaja) continue;
    const termina = q.tTermina ?? Infinity;
    if (t >= termina + SALIDA_S) continue;
    const [cx, , cz] = lugarDeCabina(q, 0);
    const parado: Punto = [X_ASEO_SOTANO, TORRE.zc + desvio(q.id, 6) * 0.8];
    const y = yPiso(0);
    if (t < q.tBaja + ASEO_ENTRADA_S) {
      personas.push(andando(q, y, [[cx, cz], PUERTA, parado], (t - q.tBaja) / ASEO_ENTRADA_S, Math.PI / 2));
    } else if (t < termina) {
      personas.push(quieto(q, parado[0], y, parado[1], Math.PI / 2));
    } else {
      personas.push(andando(q, y, [parado, puntoLateral(q), puntoSalida(q)], (t - termina) / SALIDA_S, null));
    }
  }

  return { cabina, personas };
}

// ---------------------------------------------------------------- indicadores

export interface Indicadores {
  /** Piso en que está la cabina (el más cercano). */
  piso: number;
  sentido: -1 | 0 | 1;
  /** Personas y cupos a bordo. */
  ocupantes: number;
  cupos: number;
  /** Personas en la fila de P1. */
  fila: number;
  /** Personas que se han ido por las escaleras hasta ahora. */
  escaleras: number;
}

export function indicadoresEn(ix: Indice, t: number): Indicadores {
  const cabina = cabinaEn(ix, t);
  const c = hasta(ix.tiemposCambios, t) - 1;
  const f = ix.filas[1];
  return {
    piso: Math.round(cabina.piso),
    sentido: cabina.sentido,
    ocupantes: c >= 0 ? ix.cambios[c].abordo.length : 0,
    cupos: c >= 0 ? ix.cambios[c].cupos : 0,
    fila: hasta(f.llegadasContadas, t) - hasta(f.salidasContadas, t),
    escaleras: hasta(ix.tiemposEscaleras, t),
  };
}

/** Hora del día (HH:MM:SS) al segundo `t` de una franja que empieza a la hora `horaInicioMin`. */
export function formatoReloj(horaInicioMin: number, t: number): string {
  const total = Math.floor(horaInicioMin * 60 + t) % 86400;
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(Math.floor(total / 3600))}:${dos(Math.floor((total % 3600) / 60))}:${dos(total % 60)}`;
}
