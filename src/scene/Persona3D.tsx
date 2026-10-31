// Una persona: el modelo de Kenney clonado. Su lugar, hacia dónde mira y su pose (quieta con `idle` o caminando con
// `walk`) se los pone `aplicarVista` en cada cuadro, a partir del reloj simulado: la pose sale de la distancia
// recorrida o es fija, nunca del reloj real. Si el modelo no carga, se dibuja una figura simple del mismo tamaño.

import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { AnimationMixer, type Group } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { ALTURA_PERSONA, CLIPS_SILLA } from '../data/modelos.ts';
import { CarritoAseo, Muletas, SillaDeRuedas } from './Accesorios.tsx';
import type { TipoPersona } from '../sim/tipos.ts';
import type { Manejadores } from './manejadores.ts';
import { nombreModelo, useModelo } from './modelos.ts';
import { PALETA } from './paleta.ts';
import type { PersonaVista } from './vista.ts';

interface Props {
  id: number;
  tipo: TipoPersona;
  manejadores: Manejadores;
}

const COLORES_FIGURA = [PALETA.azul, PALETA.amarillo, PALETA.verde, PALETA.rojo, PALETA.lila, PALETA.naranja];

type AplicarPose = (v: PersonaVista) => void;

export function Persona3D({ id, tipo, manejadores }: Props) {
  const grupo = useRef<Group>(null);
  const pose = useRef<AplicarPose | null>(null);
  const modelo = useModelo(nombreModelo(tipo, id));

  // Se registra para que aplicarVista la mueva; si ya hay una pose pedida para ella, la toma de una vez.
  useLayoutEffect(() => {
    const g = grupo.current;
    if (!g) return;
    const manejador = {
      poner(v: PersonaVista) {
        g.position.set(v.x, v.y, v.z);
        g.rotation.y = v.giro;
        pose.current?.(v);
      },
    };
    manejadores.personas.set(id, manejador);
    const inicial = manejadores.ultima.get(id);
    if (inicial) manejador.poner(inicial);
    return () => {
      if (manejadores.personas.get(id) === manejador) manejadores.personas.delete(id);
    };
  }, [id, manejadores]);

  return (
    <group ref={grupo}>
      {modelo.estado === 'listo' && <ModeloClonado gltf={modelo.gltf} id={id} tipo={tipo} pose={pose} manejadores={manejadores} />}
      {modelo.estado === 'error' && <FiguraSimple id={id} />}
    </group>
  );
}

/** Pose quieta y pose en movimiento de cada tipo de persona (clips del paquete de Kenney). */
export function clipsDe(tipo: TipoPersona): { quieta: string; camina: string } {
  if (tipo === 'silla') return { quieta: CLIPS_SILLA[0], camina: 'wheelchair-move-forward' };
  // Con el carrito, quieto tiene las dos manos al frente (en el manubrio); en movimiento camina.
  if (tipo === 'aseo') return { quieta: 'holding-both', camina: 'walk' };
  return { quieta: 'idle', camina: 'walk' };
}

function ModeloClonado({
  gltf,
  id,
  tipo,
  pose,
  manejadores,
}: {
  gltf: GLTF;
  id: number;
  tipo: TipoPersona;
  pose: MutableRefObject<AplicarPose | null>;
  manejadores: Manejadores;
}) {
  const invalidar = useThree((s) => s.invalidate);
  const { raiz, mezclador, quieta, camina } = useMemo(() => {
    const raiz = clone(gltf.scene);
    raiz.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    const mezclador = new AnimationMixer(raiz);
    const nombres = clipsDe(tipo);
    const clipQuieta = gltf.animations.find((a) => a.name === nombres.quieta);
    const clipCamina = gltf.animations.find((a) => a.name === nombres.camina);
    const quieta = clipQuieta ? mezclador.clipAction(clipQuieta).play() : null;
    const camina = clipCamina ? mezclador.clipAction(clipCamina).play() : null;
    return { raiz, mezclador, quieta, camina };
  }, [gltf, tipo]);

  // Las muletas siguen a las manos: se acomodan cada vez que cambia la pose.
  const muletas = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    let ultima = '';
    pose.current = (v) => {
      const andando = v.caminando && camina !== null;
      const accion = andando ? camina : quieta;
      if (!accion) return;
      const fase = ((v.ciclos % 1) + 1) % 1;
      const clave = `${andando ? 1 : 0}:${fase.toFixed(3)}`;
      if (clave === ultima) return; // la pose no cambió: no se recalcula el esqueleto
      ultima = clave;
      if (quieta) quieta.weight = andando ? 0 : 1;
      if (camina) camina.weight = andando ? 1 : 0;
      mezclador.setTime(fase * accion.getClip().duration);
      muletas.current?.();
    };
    const inicial = manejadores.ultima.get(id);
    if (inicial) pose.current(inicial);
    invalidar();
    return () => {
      pose.current = null;
      mezclador.stopAllAction();
      mezclador.uncacheRoot(raiz);
    };
  }, [mezclador, raiz, quieta, camina, pose, manejadores, id, invalidar]);

  return (
    <>
      <primitive object={raiz} />
      {tipo === 'silla' && <SillaDeRuedas />}
      {tipo === 'muletas' && <Muletas raiz={raiz} enlace={muletas} />}
      {tipo === 'aseo' && <CarritoAseo />}
    </>
  );
}

/** Figura de respaldo: cuerpo y cabeza de cubo, de la altura de una persona. */
function FiguraSimple({ id }: { id: number }) {
  const color = COLORES_FIGURA[Math.abs(id) % COLORES_FIGURA.length];
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
