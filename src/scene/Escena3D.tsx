// Lienzo de la escena 3D (un solo ascensor). Se carga aparte (React.lazy) para que el formulario no espere a three.
// Sin corrida dibuja un estado fijo de muestra; con una corrida, la sigue segundo a segundo con el reloj simulado.

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Plane, Vector3 } from 'three';
import type { TipoPersona } from '../sim/tipos.ts';
import { useAnimacion } from '../store/animacion.ts';
import { useCalidad } from '../store/calidad.ts';
import { useEscena } from '../store/escena.ts';
import { CalidadAdaptable } from './CalidadAdaptable.tsx';
import { NIVELES } from './calidad.ts';
import { Camara } from './Camara.tsx';
import { ColasExtra } from './ColasExtra.tsx';
import { estadoEn } from './corrida.ts';
import { Edificio } from './Edificio.tsx';
import { estadoDePrueba, estadoDePruebaConParametros } from './estado.ts';
import { aplicarVista, crearManejadores, type Manejadores } from './manejadores.ts';
import { Pasillo } from './Pasillo.tsx';
import { Persona3D } from './Persona3D.tsx';
import { Torre } from './Torre.tsx';
import { aVista, type EstadoVista } from './vista.ts';
import { alturaDeCorte, poseExterior } from './vistas.ts';

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
  const calidad = NIVELES[useCalidad((s) => s.nivel)];
  const manejadores = useMemo<Manejadores>(crearManejadores, []);
  const muestra = useMemo(
    () => aVista(import.meta.env.DEV ? estadoDePruebaConParametros(window.location.search) : estadoDePrueba()),
    [],
  );
  const pose = poseExterior(1.3);
  return (
    <Canvas
      dpr={[Math.min(1, calidad.dprMax), calidad.dprMax]}
      shadows={calidad.sombras ? 'percentage' : false}
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
      <Luces sombras={calidad.sombras} />
      {/* En la planta el bloque de ladrillo no se dibuja: el corte mostraría su interior hueco. */}
      <group visible={vista !== 'planta'}>
        <Edificio />
      </group>
      <Torre manejadores={manejadores} />
      <Poblacion manejadores={manejadores} />
      <ColasExtra manejadores={manejadores} />
      <Animador manejadores={manejadores} muestra={muestra} />
      {(vista === 'piso' || vista === 'planta') && <Pasillo piso={piso} />}
      <CorteDePlanta activo={vista === 'planta'} piso={piso} />
      <CalidadAdaptable />
      <Camara vista={vista} piso={piso} encuadre={encuadre} orden={orden} sinMovimiento={sinMovimiento} />
    </Canvas>
  );
}

/**
 * Luz de día: cielo y suelo (ambiente) y un sol que proyecta sombras suaves (con radio, no de borde duro). Sin
 * sombras se compensa un poco con más ambiente para que la escena no se vea más oscura.
 */
function Luces({ sombras }: { sombras: boolean }) {
  return (
    <>
      <hemisphereLight args={['#D0E8FF', '#F2BF99', sombras ? 1.25 : 1.45]} />
      <directionalLight
        position={[22, 32, 28]}
        intensity={2.3}
        color="#FFF1DC"
        castShadow={sombras}
        shadow-radius={3}
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

/**
 * La planta es un corte del piso a la altura de las cabezas: todo lo que está más arriba (techos, losas, la parte
 * alta de las paredes) se recorta con un plano de corte. Fuera de la planta no hay plano.
 */
function CorteDePlanta({ activo, piso }: { activo: boolean; piso: number }) {
  const gl = useThree((s) => s.gl);
  const invalidar = useThree((s) => s.invalidate);
  const plano = useMemo(() => new Plane(new Vector3(0, -1, 0), 0), []);
  useEffect(() => {
    if (!activo) return;
    plano.constant = alturaDeCorte(piso);
    gl.clippingPlanes = [plano];
    invalidar();
    return () => {
      gl.clippingPlanes = [];
      invalidar();
    };
  }, [activo, piso, gl, plano, invalidar]);
  return null;
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
