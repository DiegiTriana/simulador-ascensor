// Piezas básicas de la escena: cajas de bordes redondeados en colores planos, cajas repetidas en una sola
// llamada de dibujo y paneles de vidrio.

import { RoundedBox } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, DoubleSide, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { Vec3 } from './vistas.ts';

interface PropsCaja {
  posicion: Vec3;
  /** Ancho (x), alto (y) y fondo (z). */
  tam: Vec3;
  color: string;
  /** Radio de los bordes; se recorta para que quepa en la caja más delgada. */
  radio?: number;
  rotacionY?: number;
  sombra?: boolean;
  recibeSombra?: boolean;
}

/** Caja de bordes un poco redondeados, de un color plano. */
export function Caja({ posicion, tam, color, radio = 0.07, rotacionY = 0, sombra = true, recibeSombra = true }: PropsCaja) {
  const r = Math.max(0.005, Math.min(radio, Math.min(...tam) / 2 - 0.005));
  return (
    <RoundedBox
      args={tam}
      radius={r}
      smoothness={2}
      position={posicion}
      rotation={[0, rotacionY, 0]}
      castShadow={sombra}
      receiveShadow={recibeSombra}
    >
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} />
    </RoundedBox>
  );
}

export interface Instancia {
  posicion: Vec3;
  tam: Vec3;
}

const CAJA_UNIDAD = new BoxGeometry(1, 1, 1);

/** Muchas cajas del mismo color en una sola llamada de dibujo (ventanas, barras del vidrio, barandas). */
export function CajasInstanciadas({
  instancias,
  color,
  sombra = false,
  recibeSombra = false,
}: {
  instancias: Instancia[];
  color: string;
  sombra?: boolean;
  /** Las piezas delgadas (ventanas, barras) se ven manchadas si reciben sombra; solo los balcones la reciben. */
  recibeSombra?: boolean;
}) {
  const malla = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = malla.current;
    if (!m) return;
    const matriz = new Matrix4();
    const giro = new Quaternion();
    instancias.forEach((inst, i) => {
      matriz.compose(new Vector3(...inst.posicion), giro, new Vector3(...inst.tam));
      m.setMatrixAt(i, matriz);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [instancias]);
  return (
    <instancedMesh
      // Al cambiar la cantidad hay que crear otra malla: el tamaño de una InstancedMesh es fijo.
      key={instancias.length}
      ref={malla}
      args={[CAJA_UNIDAD, undefined, instancias.length]}
      castShadow={sombra}
      receiveShadow={recibeSombra}
      frustumCulled={false}
    >
      <meshStandardMaterial color={color} roughness={0.95} metalness={0} />
    </instancedMesh>
  );
}

/** Panel de vidrio: celeste muy claro y casi transparente, visible por las dos caras. */
export function Vidrio({
  posicion,
  tam,
  rotacionY = 0,
  opacidad = 0.2,
  color = '#D0E8FF',
}: {
  posicion: Vec3;
  /** Ancho y alto del panel. */
  tam: [number, number];
  rotacionY?: number;
  opacidad?: number;
  color?: string;
}) {
  const material = useMemo(() => ({ transparent: true, opacity: opacidad, side: DoubleSide, depthWrite: false }), [opacidad]);
  return (
    <mesh position={posicion} rotation={[0, rotacionY, 0]} renderOrder={2}>
      <planeGeometry args={tam} />
      <meshStandardMaterial color={color} roughness={0.2} metalness={0} {...material} />
    </mesh>
  );
}
