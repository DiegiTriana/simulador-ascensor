// Dónde está la mano de cada personaje del paquete Mini Characters. No tienen hueso de mano: la mano es el extremo del
// brazo. Se busca una sola vez por modelo, mirando qué vértices siguen al hueso del brazo y cuál queda más lejos del
// hombro, y con eso se calcula en cada cuadro dónde está la mano (para que las muletas la sigan).

import { Vector3, type Bone, type Object3D, type SkinnedMesh } from 'three';

export type Lado = 'izquierda' | 'derecha';

export interface Mano {
  hueso: Bone;
  /** Punto de la mano, en el espacio del hueso del brazo. */
  local: Vector3;
}

const HUESOS: Record<Lado, string> = { izquierda: 'arm-left', derecha: 'arm-right' };
/** Para un mismo modelo (misma geometría) el punto es el mismo en todas sus copias. */
const calculados = new Map<string, Vector3>();

function mallasConEsqueleto(raiz: Object3D): SkinnedMesh[] {
  const mallas: SkinnedMesh[] = [];
  raiz.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) mallas.push(o as SkinnedMesh);
  });
  return mallas;
}

/** El extremo del brazo de un lado: el promedio de los vértices más lejanos del hombro que siguen a ese hueso. */
function extremoDelBrazo(malla: SkinnedMesh, indice: number): Vector3 | null {
  const g = malla.geometry;
  const posicion = g.getAttribute('position');
  const hueso = g.getAttribute('skinIndex');
  const peso = g.getAttribute('skinWeight');
  if (!posicion || !hueso || !peso) return null;
  const inversa = malla.skeleton.boneInverses[indice];
  const puntos: { p: Vector3; d: number }[] = [];
  const v = new Vector3();
  for (let i = 0; i < posicion.count; i++) {
    let sigue = false;
    for (let k = 0; k < 4; k++) {
      const indiceK = k === 0 ? hueso.getX(i) : k === 1 ? hueso.getY(i) : k === 2 ? hueso.getZ(i) : hueso.getW(i);
      const pesoK = k === 0 ? peso.getX(i) : k === 1 ? peso.getY(i) : k === 2 ? peso.getZ(i) : peso.getW(i);
      if (indiceK === indice && pesoK >= 0.5) sigue = true;
    }
    if (!sigue) continue;
    v.set(posicion.getX(i), posicion.getY(i), posicion.getZ(i)).applyMatrix4(malla.bindMatrix).applyMatrix4(inversa);
    puntos.push({ p: v.clone(), d: v.length() });
  }
  if (puntos.length === 0) return null;
  const maximo = Math.max(...puntos.map((q) => q.d));
  const lejanos = puntos.filter((q) => q.d >= maximo * 0.85);
  return lejanos.reduce((s, q) => s.add(q.p), new Vector3()).multiplyScalar(1 / lejanos.length);
}

/** Las dos manos de un personaje clonado (sus huesos son los de la copia, no los del original). */
export function encontrarManos(raiz: Object3D): Record<Lado, Mano> | null {
  const manos: Partial<Record<Lado, Mano>> = {};
  for (const malla of mallasConEsqueleto(raiz)) {
    for (const lado of ['izquierda', 'derecha'] as const) {
      if (manos[lado]) continue;
      const indice = malla.skeleton.bones.findIndex((b) => b.name === HUESOS[lado]);
      if (indice < 0) continue;
      const clave = `${malla.geometry.uuid}:${lado}`;
      let local = calculados.get(clave);
      if (!local) {
        const calculado = extremoDelBrazo(malla, indice);
        if (!calculado) continue;
        local = calculado;
        calculados.set(clave, local);
      }
      manos[lado] = { hueso: malla.skeleton.bones[indice], local };
    }
  }
  return manos.izquierda && manos.derecha ? (manos as Record<Lado, Mano>) : null;
}

const mundo = new Vector3();

/** Dónde está la mano ahora, en el espacio de `raiz` (el mismo del personaje, sin su lugar en la escena). */
export function posicionDeLaMano(raiz: Object3D, mano: Mano, destino = new Vector3()): Vector3 {
  raiz.updateWorldMatrix(true, true);
  mundo.copy(mano.local);
  mano.hueso.localToWorld(mundo);
  return destino.copy(raiz.worldToLocal(mundo));
}
