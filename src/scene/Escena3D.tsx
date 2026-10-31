// Lienzo de la escena 3D (un solo ascensor). Se carga aparte (React.lazy) para que el formulario no espere a three.
// Sin corrida dibuja un estado fijo de muestra; con una corrida, la sigue segundo a segundo con el reloj simulado.

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { TipoPersona } from '../sim/tipos.ts';
import { useAnimacion } from '../store/animacion.ts';
import { useEscena } from '../store/escena.ts';
import { Camara } from './Camara.tsx';
import { estadoEn } from './corrida.ts';
import { Edificio } from './Edificio.tsx';
import { estadoDePrueba, estadoDePruebaConParametros } from './estado.ts';
import { aplicarVista, crearManejadores, type Manejadores } from './manejadores.ts';
import { Pasillo } from './Pasillo.tsx';
import { Persona3D } from './Persona3D.tsx';
import { Torre } from './Torre.tsx';
import { aVista, type EstadoVista } from './vista.ts';
import { poseExterior } from './vistas.ts';

const consulta = '(prefers-reduced-motion: reduce)';
function suscribir(aviso: () => void) {
  const m = window.matchMedia(consulta);
  m.addEventListener('change', aviso);
  return () => m.removeEventListener('change', aviso);
}
/** true si la persona pidió reducir el movimiento. */
export function useSinMovimiento(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}

interface Props {
  /** El contexto de WebGL se perdió: la interfaz muestra el aviso y el formulario sigue funcionando. */
  alPerderContexto: () => void;
}

export default function Escena3D({ alPerderContexto }: Props) {
  const vista = useEscena((s) => s.vista);
  const piso = useEscena((s) => s.piso);
  const encuadre = useEscena((s) => s.encuadre);
  const orden = useEscena((s) => s.orden);
  const sinMovimiento = useSinMovimiento();
  const manejadores = useMemo<Manejadores>(crearManejadores, []);
  const muestra = useMemo(
    () => aVista(import.meta.env.DEV ? estadoDePruebaConParametros(window.location.search) : estadoDePrueba()),
    [],
  );
  const pose = poseExterior(1.3);
  return (
    <Canvas
      dpr={[1, 2]}
      shadows="percentage"
      flat
      frameloop="demand"
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: pose.fov, near: 0.1, far: 400, position: pose.posicion }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          alPerderContexto();
        });
      }}
    >
      <Luces />
      <Edificio />
      <Torre manejadores={manejadores} />
      <Poblacion manejadores={manejadores} />
      <Animador manejadores={manejadores} muestra={muestra} />
      {vista === 'piso' && <Pasillo piso={piso} />}
      <Camara vista={vista} piso={piso} encuadre={encuadre} orden={orden} sinMovimiento={sinMovimiento} />
    </Canvas>
  );
}

function Luces() {
  return (
    <>
      <hemisphereLight args={['#D0E8FF', '#F2BF99', 1.25]} />
      <directionalLight
        position={[22, 32, 28]}
        intensity={2.3}
        color="#FFF1DC"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
      />
    </>
  );
}

/** Las personas que se dibujan ahora. Solo se vuelve a dibujar cuando cambia quién está, no en cada cuadro. */
function Poblacion({ manejadores }: { manejadores: Manejadores }) {
  const [lista, setLista] = useState<{ id: number; tipo: TipoPersona }[]>([]);
  useEffect(() => {
    manejadores.alCambiarPersonas = setLista;
    return () => {
      manejadores.alCambiarPersonas = null;
    };
  }, [manejadores]);
  return (
    <group>
      {lista.map((p) => (
        <Persona3D key={p.id} id={p.id} tipo={p.tipo} manejadores={manejadores} />
      ))}
    </group>
  );
}

/**
 * Lleva el reloj simulado y coloca todo en cada cuadro. Mientras la corrida está en marcha pide cuadros sin parar; en
 * pausa no pide ninguno, y la escena queda exactamente como estaba. Cualquier cambio del almacén (mover la barra,
 * reiniciar, corrida nueva o descartada) pide un cuadro para recolocar.
 */
function Animador({ manejadores, muestra }: { manejadores: Manejadores; muestra: EstadoVista }) {
  const invalidar = useThree((s) => s.invalidate);
  const anterior = useRef<number | null>(null);

  useEffect(() => useAnimacion.subscribe(() => invalidar()), [invalidar]);

  useFrame(() => {
    const a = useAnimacion.getState();
    const corrida = a.corrida;
    if (!corrida) {
      anterior.current = null;
      aplicarVista(manejadores, muestra);
      return;
    }
    if (a.enMarcha) {
      const ahora = performance.now();
      // El primer cuadro después de una pausa no avanza el reloj: no se cuenta el rato que estuvo quieto.
      if (anterior.current !== null) a.avanzar((ahora - anterior.current) / 1000);
      anterior.current = ahora;
    } else {
      anterior.current = null;
    }
    aplicarVista(manejadores, estadoEn(corrida.indice, corrida.reloj.t));
    if (useAnimacion.getState().enMarcha) invalidar();
  });
  return null;
}
