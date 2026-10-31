// Los objetos de la escena que se mueven con el reloj. Cada uno se registra aquí al montarse y `aplicarVista` los
// coloca en cada cuadro sin pasar por React (la interfaz no se vuelve a dibujar por cada cuadro).

import type { CanvasTexture, MeshBasicMaterial, Object3D } from 'three';
import type { TipoPersona } from '../sim/tipos.ts';
import { PISO_MAXIMO, PUERTA, TORRE, pisoDeCabina, yPiso } from './medidas.ts';
import type { EstadoVista, PersonaVista } from './vista.ts';

/** Cada hoja de puerta mide la mitad del hueco y, al abrir, se corre esto detrás de la jamba. */
const HOJA = PUERTA.ancho / 2;

export interface ManejadorPersona {
  poner(v: PersonaVista): void;
}

export interface Manejadores {
  cabina: Object3D | null;
  /** Las dos hojas de la puerta de la cabina (z local). */
  hojasCabina: (Object3D | null)[];
  /** Las dos hojas de la puerta de cada piso, de S (0) a P9 (z del mundo). */
  hojasPiso: (Object3D | null)[][];
  materialIndicador: MeshBasicMaterial | null;
  /** Una textura por sentido y piso, listas cuando la fuente está cargada. */
  texturasIndicador: Map<string, CanvasTexture> | null;
  personas: Map<number, ManejadorPersona>;
  /** El rótulo «+N personas» de cada piso, de S (0) a P9; null hasta que la fuente está lista. */
  colasExtra: ({ poner(n: number): void } | null)[];
  /** Última pose pedida de cada persona, para las que se montan después de pedirla. */
  ultima: Map<number, PersonaVista>;
  alCambiarPersonas: ((lista: { id: number; tipo: TipoPersona }[]) => void) | null;
  // Lo último que se aplicó, para no repetir trabajo.
  _aperturaPisos: number[];
  _claveIndicador: string;
  _claveGente: string;
}

export function crearManejadores(): Manejadores {
  return {
    cabina: null,
    hojasCabina: [null, null],
    hojasPiso: Array.from({ length: PISO_MAXIMO + 1 }, () => [null, null]),
    materialIndicador: null,
    texturasIndicador: null,
    personas: new Map(),
    colasExtra: Array.from({ length: PISO_MAXIMO + 1 }, () => null),
    ultima: new Map(),
    alCambiarPersonas: null,
    _aperturaPisos: Array.from({ length: PISO_MAXIMO + 1 }, () => -1),
    _claveIndicador: '',
    _claveGente: '',
  };
}

export const claveIndicador = (piso: number, sentido: number): string => `${sentido}|${piso}`;

/** Coloca la cabina, sus puertas, las puertas de los pisos, el indicador y a cada persona según el estado. */
export function aplicarVista(m: Manejadores, v: EstadoVista): void {
  const { cabina } = v;
  if (m.cabina) m.cabina.position.y = yPiso(cabina.piso) + 0.02;

  const corrimiento = Math.min(1, Math.max(0, cabina.puertas)) * HOJA;
  m.hojasCabina.forEach((hoja, i) => {
    if (hoja) hoja.position.z = (i === 0 ? -1 : 1) * (HOJA / 2 + corrimiento);
  });

  const abierto = pisoDeCabina(cabina.piso);
  for (let piso = 0; piso <= PISO_MAXIMO; piso++) {
    const apertura = piso === abierto ? cabina.puertas : 0;
    if (m._aperturaPisos[piso] === apertura) continue;
    m._aperturaPisos[piso] = apertura;
    const c = Math.min(1, Math.max(0, apertura)) * HOJA;
    m.hojasPiso[piso].forEach((hoja, i) => {
      if (hoja) hoja.position.z = TORRE.zc + (i === 0 ? -1 : 1) * (HOJA / 2 + c);
    });
  }

  if (m.materialIndicador && m.texturasIndicador) {
    const piso = Math.min(PISO_MAXIMO, Math.max(0, Math.round(cabina.piso)));
    const clave = claveIndicador(piso, cabina.sentido);
    if (clave !== m._claveIndicador) {
      const textura = m.texturasIndicador.get(clave);
      if (textura) {
        m.materialIndicador.map = textura;
        m.materialIndicador.needsUpdate = true;
        m._claveIndicador = clave;
      }
    }
  }

  // Quién se dibuja: solo cuando cambia el conjunto se vuelve a dibujar el árbol de React.
  let clave = '';
  for (const p of v.personas) clave += `${p.id},`;
  m.ultima.clear();
  for (const p of v.personas) m.ultima.set(p.id, p);
  if (clave !== m._claveGente) {
    m._claveGente = clave;
    m.alCambiarPersonas?.(v.personas.map((p) => ({ id: p.id, tipo: p.tipo })));
  }
  for (const p of v.personas) m.personas.get(p.id)?.poner(p);
  v.extras.forEach((n, piso) => m.colasExtra[piso]?.poner(n));
}
