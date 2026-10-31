// Lo que acompaña a algunas personas: la silla de ruedas y las muletas (modelos de Kenney) y el carrito del aseo
// (cubos de colores planos, en el mismo estilo). Todo es hijo del grupo de la persona, que mira a +z.

import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { Box3, MathUtils, Vector3, type Group, type Object3D } from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { MODELO_MULETA, MODELO_SILLA } from '../data/modelos.ts';
import { encontrarManos, posicionDeLaMano, type Lado } from './manos.ts';
import { useModelo } from './modelos.ts';
import { PALETA } from './paleta.ts';
import { Caja } from './piezas.tsx';

function sombras(o: Object3D): Object3D {
  o.traverse((n) => {
    n.castShadow = true;
    n.receiveShadow = true;
  });
  return o;
}

/** La silla de ruedas: la persona y la silla comparten origen; con el clip wheelchair-sit queda sentada. */
export function SillaDeRuedas() {
  const modelo = useModelo(MODELO_SILLA);
  const silla = useMemo(() => (modelo.estado === 'listo' ? sombras(clone(modelo.gltf.scene)) : null), [modelo]);
  return silla ? <primitive object={silla} /> : null;
}

/** Altura (en el modelo de la muleta) del puño donde se agarra, y cuánto sale hacia delante. */
const PUNO = { y: 0.34, z: 0.12 };
const ESCALA_MAXIMA = 1.6;

/**
 * Dos muletas que siguen a las manos: cada una se para derecha en el suelo, debajo de la mano, y se estira si hace
 * falta para llegar al piso. `enlace.current` es la función que las acomoda; la persona la llama cada vez que cambia
 * su pose.
 */
export function Muletas({ raiz, enlace }: { raiz: Object3D; enlace: MutableRefObject<(() => void) | null> }) {
  const modelo = useModelo(MODELO_MULETA);
  const invalidar = useThree((s) => s.invalidate);
  const grupos = useRef<(Group | null)[]>([null, null]);
  const manos = useMemo(() => encontrarManos(raiz), [raiz]);
  const muletas = useMemo(() => {
    if (modelo.estado !== 'listo') return null;
    const una = () => sombras(clone(modelo.gltf.scene));
    return [una(), una()];
  }, [modelo]);
  const suelo = useMemo(() => (muletas ? new Box3().setFromObject(muletas[0]).min.y : 0), [muletas]);

  useLayoutEffect(() => {
    if (!muletas || !manos) return;
    const punto = new Vector3();
    const acomodar = () => {
      (['izquierda', 'derecha'] as Lado[]).forEach((lado, i) => {
        const grupo = grupos.current[i];
        if (!grupo) return;
        posicionDeLaMano(raiz, manos[lado], punto);
        const escala = MathUtils.clamp(punto.y / PUNO.y, 1, ESCALA_MAXIMA);
        grupo.scale.setScalar(escala);
        grupo.position.set(punto.x, -suelo * escala, punto.z - PUNO.z * escala);
      });
    };
    enlace.current = acomodar;
    acomodar();
    invalidar();
    return () => {
      enlace.current = null;
    };
  }, [muletas, manos, raiz, suelo, enlace, invalidar]);

  if (!muletas) return null;
  return (
    <>
      {muletas.map((m, i) => (
        <group
          key={i}
          ref={(g) => {
            grupos.current[i] = g;
          }}
        >
          <primitive object={m} />
        </group>
      ))}
    </>
  );
}

/**
 * Carrito de aseo: bandeja con ruedas, un cajón azul, un balde amarillo, una bolsa y un trapeador, con un manubrio
 * donde el personal pone las manos. Mide unos 0,8 de ancho y 1,5 de largo, y sale hacia delante de la persona.
 */
export function CarritoAseo() {
  const ruedas: [number, number][] = [
    [-0.4, 0.62],
    [0.4, 0.62],
    [-0.4, 1.38],
    [0.4, 1.38],
  ];
  return (
    <group>
      {/* Manubrio */}
      <Caja posicion={[0, 0.72, 0.56]} tam={[0.78, 0.07, 0.07]} color={PALETA.gris} radio={0.03} sombra={false} />
      <Caja posicion={[-0.34, 0.5, 0.64]} tam={[0.07, 0.45, 0.07]} color={PALETA.gris} radio={0.03} sombra={false} />
      <Caja posicion={[0.34, 0.5, 0.64]} tam={[0.07, 0.45, 0.07]} color={PALETA.gris} radio={0.03} sombra={false} />
      {/* Bandeja y cajón */}
      <Caja posicion={[0, 0.3, 1]} tam={[0.86, 0.09, 1.0]} color={PALETA.pizarra} radio={0.04} />
      <Caja posicion={[0, 0.58, 1.12]} tam={[0.74, 0.46, 0.74]} color={PALETA.azul} radio={0.06} />
      {/* Balde, bolsa y trapeador */}
      <mesh position={[0.17, 0.97, 1.2]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.32, 8]} />
        <meshStandardMaterial color={PALETA.amarillo} roughness={0.95} flatShading />
      </mesh>
      <Caja posicion={[-0.2, 0.96, 1.0]} tam={[0.32, 0.3, 0.32]} color={PALETA.crema} radio={0.07} />
      <Caja posicion={[-0.3, 1.2, 1.4]} tam={[0.05, 1.05, 0.05]} color={PALETA.grisClaro} radio={0.02} sombra={false} />
      <Caja posicion={[-0.3, 1.78, 1.4]} tam={[0.34, 0.12, 0.16]} color={PALETA.rojo} radio={0.05} />
      {/* Ruedas */}
      {ruedas.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.13, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.09, 8]} />
          <meshStandardMaterial color={PALETA.negro} roughness={0.95} flatShading />
        </mesh>
      ))}
    </group>
  );
}
