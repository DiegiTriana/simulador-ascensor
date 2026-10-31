// Lo que la escena dibuja en un instante, ya con posiciones: la cabina (piso, puertas, sentido) y cada persona
// visible con su lugar, hacia dónde mira y si camina. Lo calculan `estadoEn` (de la traza y un segundo simulado)
// y `aVista` (del estado fijo de muestra).

import type { TipoPersona } from '../sim/tipos.ts';
import { MAX_POR_PISO } from './corrida.ts';
import { lugarEnCabina, lugarEnFila } from './disposicion.ts';
import type { EstadoEscena } from './estado.ts';
import { CABINA, TORRE, yPiso } from './medidas.ts';

export interface PersonaVista {
  id: number;
  tipo: TipoPersona;
  x: number;
  y: number;
  z: number;
  /** Giro alrededor de y; los modelos miran a +z cuando es 0. */
  giro: number;
  caminando: boolean;
  /** Ciclos del paso (si camina: distancia ÷ zancada) o fase fija de la pose quieta. Solo se usa su parte decimal. */
  ciclos: number;
}

export interface CabinaVista {
  /** 0 = sótano, 1..9 = P1..P9; con decimales entre dos pisos. */
  piso: number;
  /** 0 = puertas cerradas, 1 = abiertas del todo (las de la cabina y las del piso donde está). */
  puertas: number;
  sentido: -1 | 0 | 1;
}

export interface EstadoVista {
  cabina: CabinaVista;
  personas: PersonaVista[];
  /** Por piso (0 = sótano): cuántas personas esperan además de las que se dibujan («+N personas»). */
  extras: number[];
}

/** Estado fijo de muestra → lo mismo que se dibuja con una corrida, con todos quietos. */
export function aVista(e: EstadoEscena): EstadoVista {
  const personas: PersonaVista[] = [];
  e.filas.forEach((fila, piso) => {
    fila.slice(0, MAX_POR_PISO).forEach((p, i) => {
      const l = lugarEnFila(i, p.id);
      personas.push({ id: p.id, tipo: p.tipo, x: l.x, y: yPiso(piso), z: l.z, giro: l.giro, caminando: false, ciclos: 0.5 + (p.id % 7) / 14 });
    });
  });
  const yCabina = yPiso(e.cabina.piso) + 0.02;
  e.cabina.ocupantes.slice(0, 10).forEach((p, i) => {
    const l = lugarEnCabina(i);
    personas.push({
      id: p.id, tipo: p.tipo, x: CABINA.xCentro + l.x, y: yCabina, z: TORRE.zc + l.z, giro: l.giro, caminando: false, ciclos: 0.5 + (p.id % 7) / 14,
    });
  });
  return {
    cabina: { piso: e.cabina.piso, puertas: e.cabina.puertas, sentido: e.cabina.sentido },
    personas,
    extras: e.filas.map((fila) => Math.max(0, fila.length - MAX_POR_PISO)),
  };
}
