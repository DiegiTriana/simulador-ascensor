// Carga de los GLB de public/modelos/ (Meshopt, sin peticiones externas). Cada archivo se pide una sola vez y
// después se clona por persona. Si un modelo no carga, quien lo use dibuja una figura simple.

import { useEffect, useState } from 'react';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MODELO_ASEO, estudiantePorNumero } from '../data/modelos.ts';
import type { TipoPersona } from '../sim/tipos.ts';

const pedidos = new Map<string, Promise<GLTF>>();
const listos = new Map<string, GLTF>();
const fallidos = new Set<string>();

export function cargarModelo(nombre: string): Promise<GLTF> {
  let pedido = pedidos.get(nombre);
  if (!pedido) {
    const cargador = new GLTFLoader();
    cargador.setMeshoptDecoder(MeshoptDecoder);
    pedido = cargador.loadAsync(`${import.meta.env.BASE_URL}modelos/${nombre}.glb`).then(
      (gltf) => {
        listos.set(nombre, gltf);
        return gltf;
      },
      (error: unknown) => {
        fallidos.add(nombre);
        throw error;
      },
    );
    pedidos.set(nombre, pedido);
  }
  return pedido;
}

export type ModeloCargado = { estado: 'cargando' } | { estado: 'error' } | { estado: 'listo'; gltf: GLTF };

/** Estado de carga de un modelo; la primera vez que alguien lo pide empieza a cargarlo. */
export function useModelo(nombre: string): ModeloCargado {
  const [, avisar] = useState(0);
  useEffect(() => {
    if (listos.has(nombre) || fallidos.has(nombre)) return;
    let vivo = true;
    cargarModelo(nombre).then(
      () => vivo && avisar((n) => n + 1),
      () => vivo && avisar((n) => n + 1),
    );
    return () => {
      vivo = false;
    };
  }, [nombre]);
  const gltf = listos.get(nombre);
  if (gltf) return { estado: 'listo', gltf };
  return fallidos.has(nombre) ? { estado: 'error' } : { estado: 'cargando' };
}

/** Modelo de una persona. La silla de ruedas y las muletas llegan en la parte 3; hasta entonces se ve como estudiante. */
export function nombreModelo(tipo: TipoPersona, id: number): string {
  return tipo === 'aseo' ? MODELO_ASEO : estudiantePorNumero(Math.max(0, id));
}
