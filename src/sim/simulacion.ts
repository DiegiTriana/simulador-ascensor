// Simulación del único ascensor, segundo a segundo. El tiempo interno va en décimas de
// segundo para que los 3,3 s y 4,3 s de las puertas sean exactos.

import { PARAMETROS as P } from '../data/parametros.ts';
import { generarEscenario, type OpcionesEscenario } from './llegadas.ts';
import { crearRng } from './rng.ts';
import type { Entradas, EventoTraza, Escenario, Persona, Resultado, Traza, Vuelta } from './tipos.ts';

const DS = 10;

export interface Config {
  capacidad: number;
  probEscaleras: number;
  /** En décimas de segundo. */
  dsPorPiso: number;
  dsAbrir: number;
  dsCerrar: number;
  dsMinAbierta: number;
  dsPorPersona: number;
  dsAseo: number;
  /** Segundos extra tras terminar la franja para que se atienda a quienes siguen en el sistema. */
  drenajeMaxS: number;
}

export const CONFIG_DEFECTO: Config = {
  capacidad: P.capacidad,
  probEscaleras: P.probEscaleras,
  dsPorPiso: Math.round(P.tiempos.porPiso * DS),
  dsAbrir: Math.round(P.tiempos.abrir * DS),
  dsCerrar: Math.round(P.tiempos.cerrar * DS),
  dsMinAbierta: Math.round(P.tiempos.minAbierta * DS),
  dsPorPersona: Math.round(P.tiempos.porPersona * DS),
  dsAseo: Math.round(P.tiempos.aseo * DS),
  drenajeMaxS: 3600,
};

type Modo = 'quieto' | 'moviendo' | 'abriendo' | 'abierto' | 'cerrando';
type FaseAseo = 'aP1' | 'aS' | 'ocupado';

export function simularEntradas(
  entradas: Entradas,
  semilla: number,
  config: Config = CONFIG_DEFECTO,
  opciones: OpcionesEscenario = {},
  traza?: Traza,
): Resultado {
  return simular(generarEscenario(entradas, semilla, opciones), semilla, config, traza);
}

/**
 * Corre la simulación. Si se pasa `traza`, se llena con los hechos de la corrida (cabina, puertas, quién sube,
 * baja o se va por las escaleras) para animarla. La traza solo anota: no usa el generador aleatorio ni cambia
 * nada de lo que se calcula, así que el resultado es el mismo con o sin ella.
 */
export function simular(escenario: Escenario, semilla: number, cfg: Config = CONFIG_DEFECTO, traza?: Traza): Resultado {
  const T = escenario.duracionS;
  const rngEscaleras = crearRng((semilla ^ 0x9e3779b9) >>> 0);
  const personas: Persona[] = escenario.personas.map((p) => ({ ...p }));
  const colas: Persona[][] = Array.from({ length: P.pisoMaximo + 1 }, () => []);
  const ocupantes: Persona[] = [];
  const vueltas: Vuelta[] = [];
  const dentroPico = (t: number) => escenario.ventanasPico.some(([a, b]) => t >= a && t < b);

  let ahora = 0; // décimas de segundo
  let modo: Modo = 'quieto';
  let timer = 0;
  let piso = 1;
  let dir = 0;
  let aseo: { fase: FaseAseo; hasta: number } | null = null;
  let aseoPendiente = 0;
  let aseoAtendidos = 0;
  /** Décimas de segundo en que el personal de aseo bajó en el sótano (para la traza). */
  let aseoBajoEn = 0;
  let abandonos = 0;
  let vueltaActual: Vuelta | null = null;
  let ultimaAperturaP1: Vuelta | null = null;

  const seg = () => ahora / DS;
  const anotar = (e: EventoTraza) => {
    traza?.eventos.push(e);
  };
  // Con las puertas abiertas se entra y se sale de a una persona, 2 s cada una (así se calcula cuánto quedan
  // abiertas). Esto da el segundo de cada movimiento, solo para la traza.
  let libreDesde = 0;
  const inicioDeMovimiento = () => {
    const inicio = Math.max(ahora, libreDesde);
    libreDesde = inicio + cfg.dsPorPersona;
    return inicio / DS;
  };
  const libres = () => cfg.capacidad - ocupantes.reduce((s, p) => s + p.cupos, 0);
  const alguienCabe = (f: number) => {
    const l = libres();
    return colas[f].some((p) => p.cupos <= l);
  };

  /** Pisos con algo que atender: destinos de la cabina y filas donde alguien cabe. */
  function pedidos(): number[] {
    const set = new Set<number>(ocupantes.map((p) => p.destino));
    for (let f = 1; f <= P.pisoMaximo; f++) if (colas[f].length > 0 && alguienCabe(f)) set.add(f);
    return [...set];
  }
  const adelante = (f: number, d: number, reqs: number[]) => reqs.some((r) => (r - f) * d > 0);

  function mover() {
    anotar({ t: seg(), tipo: 'mueve', desde: piso, hacia: piso + dir, llega: (ahora + cfg.dsPorPiso) / DS });
    modo = 'moviendo';
    timer = cfg.dsPorPiso;
  }
  function abrir() {
    anotar({ t: seg(), tipo: 'abre', piso });
    modo = 'abriendo';
    timer = cfg.dsAbrir;
  }

  function decidir() {
    if (aseo) {
      if (aseo.fase === 'ocupado') {
        if (ahora < aseo.hasta) return;
        anotar({ t: Math.max(aseo.hasta, aseoBajoEn) / DS, tipo: 'aseoTermina' });
        aseo = null;
      } else if (aseo.fase === 'aP1') {
        if (piso === 1) abrir();
        else {
          dir = piso > 1 ? -1 : 1;
          mover();
        }
        return;
      } else {
        dir = -1;
        mover();
        return;
      }
    }
    const reqs = pedidos();
    if (aseoPendiente > 0 && ocupantes.length === 0 && reqs.length === 0) {
      aseoPendiente--;
      aseo = { fase: 'aP1', hasta: 0 };
      decidir();
      return;
    }
    if (reqs.length === 0) return; // sin llamadas se queda en su última parada
    if (reqs.includes(piso)) {
      // Fila en este mismo piso: abre solo si esa gente puede subir (no sube a un ascensor que sigue hacia arriba con pasajeros).
      const otros = reqs.filter((r) => r !== piso);
      if (ocupantes.length === 0 || piso === 1 || dir === -1 || !adelante(piso, dir || 1, otros)) {
        dir = piso === 1 ? 1 : -1;
        abrir();
        return;
      }
      reqs.splice(reqs.indexOf(piso), 1);
    }
    let d = dir || (reqs[0] > piso ? 1 : -1);
    if (!adelante(piso, d, reqs)) d = -d;
    dir = d;
    mover();
  }

  /** Al llegar a un piso: parar si hay bajada, o fila que va en el sentido del ascensor. */
  function alLlegar() {
    if (aseo) {
      const objetivo = aseo.fase === 'aP1' ? 1 : 0;
      if (piso === objetivo) abrir();
      else mover();
      return;
    }
    const reqs = pedidos();
    const baja = ocupantes.some((p) => p.destino === piso);
    const recoge =
      colas[piso].length > 0 && alguienCabe(piso) && (piso === 1 || dir === -1 || !adelante(piso, dir, reqs));
    if (baja || recoge) abrir();
    else if (adelante(piso, dir, reqs)) mover();
    else {
      modo = 'quieto';
      decidir();
    }
  }

  /** Sube a quienes caben: primero sillas y muletas, luego por orden de llegada. */
  function abordar(f: number): number {
    const cola = colas[f];
    const orden = [...cola.filter((p) => p.tipo !== 'normal'), ...cola.filter((p) => p.tipo === 'normal')];
    let subieron = 0;
    for (const p of orden) {
      if (p.cupos <= libres()) {
        cola.splice(cola.indexOf(p), 1);
        p.abordo = seg();
        ocupantes.push(p);
        anotar({ t: inicioDeMovimiento(), tipo: 'sube', persona: p.id, piso: f });
        subieron++;
      }
    }
    return subieron;
  }

  function puedeAbordar(f: number): boolean {
    if (aseo || f < 1) return false;
    return f === 1 || dir === -1 || !adelante(f, dir, pedidos());
  }

  /** Puertas totalmente abiertas: bajan y suben. */
  function intercambio() {
    anotar({ t: seg(), tipo: 'abierta', piso });
    libreDesde = ahora;
    let movimientos = 0;
    for (let i = ocupantes.length - 1; i >= 0; i--) {
      const p = ocupantes[i];
      if (p.destino === piso) {
        ocupantes.splice(i, 1);
        if (p.tipo !== 'aseo') p.bajo = seg();
        anotar({ t: inicioDeMovimiento(), tipo: 'baja', persona: p.id, piso });
        if (p.tipo === 'aseo') aseoBajoEn = ahora;
        movimientos++;
      }
    }
    if (aseo) {
      if (aseo.fase === 'aP1' && piso === 1) {
        ocupantes.push({
          id: -1, tipo: 'aseo', cupos: 1, origen: 1, destino: 0, llegada: 0, inicial: false,
          enPico: false, abordo: null, bajo: null, seFue: false,
        });
        anotar({ t: inicioDeMovimiento(), tipo: 'sube', persona: -1, piso: 1 });
        aseo = { fase: 'aS', hasta: ahora + cfg.dsAseo };
        aseoAtendidos++;
        movimientos++;
        vueltaActual = { t: seg(), aseo: true, esperando: 1, suben: 1, quedanAfuera: 0, rechazos: 0, duracion: null };
        registrarVuelta(vueltaActual);
      } else if (aseo.fase === 'aS' && piso === 0) {
        aseo.fase = 'ocupado';
      }
    } else if (puedeAbordar(piso)) {
      const esperando = colas[piso].length;
      const suben = abordar(piso);
      movimientos += suben;
      if (piso === 1) {
        vueltaActual = { t: seg(), aseo: false, esperando, suben, quedanAfuera: 0, rechazos: 0, duracion: null };
        registrarVuelta(vueltaActual);
      }
    }
    // Los 6,3 s mínimos se cuentan desde que empiezan a abrir (ya pasaron los 3,3 s de abrir).
    timer = Math.max(cfg.dsMinAbierta - cfg.dsAbrir, cfg.dsPorPersona * movimientos);
    modo = 'abierto';
  }

  function registrarVuelta(v: Vuelta) {
    if (ultimaAperturaP1) ultimaAperturaP1.duracion = v.t - ultimaAperturaP1.t;
    ultimaAperturaP1 = v;
    vueltas.push(v);
  }

  /** Al empezar a cerrar en P1, quien no cupo se va por las escaleras con 85 %. */
  function cerrar() {
    anotar({ t: seg(), tipo: 'cierra', piso });
    if (piso === 1 && !aseo) {
      const noCupieron = colas[1].length;
      let rechazos = 0;
      for (const p of [...colas[1]]) {
        if (p.tipo === 'normal' && rngEscaleras() < cfg.probEscaleras) {
          colas[1].splice(colas[1].indexOf(p), 1);
          p.seFue = true;
          anotar({ t: seg(), tipo: 'escaleras', persona: p.id });
          abandonos++;
          rechazos++;
        }
      }
      if (vueltaActual) {
        vueltaActual.quedanAfuera = noCupieron;
        vueltaActual.rechazos = rechazos;
      }
    }
    modo = 'cerrando';
    timer = cfg.dsCerrar;
  }

  /** Quien llega con las puertas abiertas y cabe, sube. */
  function abordajeTardio() {
    if (modo !== 'abierto' || !puedeAbordar(piso) || colas[piso].length === 0) return;
    const suben = abordar(piso);
    if (suben > 0) {
      timer += cfg.dsPorPersona * suben;
      if (piso === 1 && vueltaActual) vueltaActual.suben += suben;
    }
  }

  function avanzar() {
    abordajeTardio();
    let resto = DS;
    while (resto > 0) {
      if (modo === 'quieto') {
        decidir();
        if (modo === 'quieto') {
          ahora += resto;
          return;
        }
        continue;
      }
      const usar = Math.min(resto, timer);
      timer -= usar;
      resto -= usar;
      ahora += usar;
      if (timer > 0) continue;
      switch (modo) {
        case 'moviendo':
          piso += dir;
          alLlegar();
          break;
        case 'abriendo':
          intercambio();
          break;
        case 'abierto':
          cerrar();
          break;
        case 'cerrando':
          anotar({ t: seg(), tipo: 'cerrada', piso });
          modo = 'quieto';
          if (piso === 1) vueltaActual = null;
          break;
        default:
          break;
      }
    }
  }

  // --- Bucle principal ---
  let siguiente = 0;
  let siguienteAseo = 0;
  let sumaLq = 0, sumaL = 0, segTotal = 0;
  let sumaLqPico = 0, sumaLPico = 0, segPico = 0;
  let filaMaxima = 0;
  const limite = T + cfg.drenajeMaxS;

  for (let t = 0; t < limite; t++) {
    while (siguiente < personas.length && personas[siguiente].llegada <= t) {
      const p = personas[siguiente++];
      colas[p.origen].push(p);
    }
    while (siguienteAseo < escenario.solicitudesAseo.length && escenario.solicitudesAseo[siguienteAseo] <= t) {
      siguienteAseo++;
      aseoPendiente++;
    }
    if (t < T) {
      const q = colas[1].length;
      const l = q + ocupantes.filter((p) => p.origen === 1 && p.tipo !== 'aseo').length;
      sumaLq += q;
      sumaL += l;
      segTotal++;
      if (q > filaMaxima) filaMaxima = q;
      if (dentroPico(t)) {
        sumaLqPico += q;
        sumaLPico += l;
        segPico++;
      }
    }
    avanzar();

    if (t >= T && siguiente >= personas.length && colas.every((c) => c.length === 0) && ocupantes.length === 0) {
      if (modo === 'quieto' && !aseo) break;
    }
  }

  if (traza) {
    traza.finS = ahora / DS;
    traza.personas = personas.map((p) => ({
      id: p.id, tipo: p.tipo, cupos: p.cupos, origen: p.origen, destino: p.destino, llegada: p.llegada,
    }));
    traza.personas.push({ id: -1, tipo: 'aseo', cupos: 1, origen: 1, destino: 0, llegada: 0 });
  }

  // --- Resultados ---
  const subidas = personas.filter((p) => p.origen === 1);
  const abordaron = subidas.filter((p) => p.abordo !== null);
  const enPico = subidas.filter((p) => p.enPico);
  const enVentana = enPico.filter((p) => !p.inicial);
  const media = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  const bajaron = personas.filter((p) => p.origen > 1);
  const saturadas = vueltas.filter((v) => !v.aseo && v.quedanAfuera > 0 && v.duracion !== null);
  const segSaturadas = saturadas.reduce((s, v) => s + (v.duracion as number), 0);

  return {
    semilla,
    llegadas: subidas.length,
    abordaron: abordaron.length,
    abandonos,
    abandonoPct: subidas.length ? (100 * abandonos) / subidas.length : 0,
    pico: {
      segundos: segPico,
      llegadas: enPico.length,
      llegadasEnVentana: enVentana.length,
      abandonos: enPico.filter((p) => p.seFue).length,
      abandonoPct: enPico.length ? (100 * enPico.filter((p) => p.seFue).length) / enPico.length : null,
      lambdaPorMin: segPico ? enVentana.length / (segPico / 60) : null,
      Lq: segPico ? sumaLqPico / segPico : null,
      L: segPico ? sumaLPico / segPico : null,
    },
    Lq: segTotal ? sumaLq / segTotal : 0,
    L: segTotal ? sumaL / segTotal : 0,
    muPorMin: segSaturadas ? (saturadas.reduce((s, v) => s + v.suben, 0) / segSaturadas) * 60 : null,
    Wq: media(abordaron.map((p) => (p.abordo as number) - p.llegada)),
    W: media(abordaron.filter((p) => p.bajo !== null).map((p) => (p.bajo as number) - p.llegada)),
    filaMaxima,
    bajan: {
      total: bajaron.length,
      atendidos: bajaron.filter((p) => p.bajo !== null).length,
      esperaPromedio: media(bajaron.filter((p) => p.bajo !== null).map((p) => (p.bajo as number) - p.llegada)),
    },
    aseoAtendidos,
    vueltas,
  };
}
