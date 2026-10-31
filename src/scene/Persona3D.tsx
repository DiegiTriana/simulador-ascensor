// Una persona: el modelo de Kenney clonado, en la pose `idle` (quieta, sin reloj propio: en la parte 2 la
// pose saldrá del reloj simulado). Si el modelo no carga, se dibuja una figura simple del mismo tamaño.

import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { AnimationMixer } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { ALTURA_PERSONA } from '../data/modelos.ts';
import type { TipoPersona } from '../sim/tipos.ts';
import { desvio } from './disposicion.ts';
import { nombreModelo, useModelo } from './modelos.ts';
import { PALETA } from './paleta.ts';
import type { Vec3 } from './vistas.ts';

interface Props {
  id: number;
  tipo: TipoPersona;
  posicion: Vec3;
  giro: number;
}

const COLORES_FIGURA = [PALETA.azul, PALETA.amarillo, PALETA.verde, PALETA.rojo, PALETA.lila, PALETA.naranja];

export function Persona3D({ id, tipo, posicion, giro }: Props) {
  const modelo = useModelo(nombreModelo(tipo, id));
  return (
    <group position={posicion} rotation={[0, giro, 0]}>
      {modelo.estado === 'listo' && <ModeloClonado gltf={modelo.gltf} id={id} />}
      {modelo.estado === 'error' && <FiguraSimple id={id} />}
    </group>
  );
}

function ModeloClonado({ gltf, id }: { gltf: GLTF; id: number }) {
  const invalidar = useThree((s) => s.invalidate);
  const { raiz, mezclador } = useMemo(() => {
    const raiz = clone(gltf.scene);
    raiz.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    const mezclador = new AnimationMixer(raiz);
    const idle = gltf.animations.find((a) => a.name === 'idle');
    if (idle) {
      mezclador.clipAction(idle).play();
      // Pose fija: cada persona queda en un punto distinto del ciclo para que no sean idénticas.
      mezclador.setTime((desvio(id, 7) + 0.5) * idle.duration);
    }
    return { raiz, mezclador };
  }, [gltf, id]);
  useEffect(() => {
    invalidar();
    return () => {
      mezclador.stopAllAction();
      mezclador.uncacheRoot(raiz);
    };
  }, [mezclador, raiz, invalidar]);
  return <primitive object={raiz} />;
}

/** Figura de respaldo: cuerpo y cabeza de cubo, de la altura de una persona. */
function FiguraSimple({ id }: { id: number }) {
  const color = COLORES_FIGURA[id % COLORES_FIGURA.length];
  const alto = ALTURA_PERSONA;
  return (
    <group>
      <mesh position={[0, alto * 0.2, 0]} castShadow>
        <boxGeometry args={[0.5, alto * 0.4, 0.3]} />
        <meshStandardMaterial color={PALETA.pizarra} roughness={0.95} />
      </mesh>
      <mesh position={[0, alto * 0.5, 0]} castShadow>
        <boxGeometry args={[0.62, alto * 0.26, 0.36]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[0, alto * 0.82, 0]} castShadow>
        <boxGeometry args={[0.52, alto * 0.3, 0.52]} />
        <meshStandardMaterial color={PALETA.piel} roughness={0.95} />
      </mesh>
    </group>
  );
}
