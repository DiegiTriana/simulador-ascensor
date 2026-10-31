// Lienzo de la escena 3D (un solo ascensor). Se carga aparte (React.lazy) para que el formulario no espere a three.
// En esta parte dibuja un estado fijo de prueba; en la parte 2 lo dará el reloj simulado.

import { Canvas } from '@react-three/fiber';
import { useMemo, useSyncExternalStore } from 'react';
import { useEscena } from '../store/escena.ts';
import { Camara } from './Camara.tsx';
import { Edificio } from './Edificio.tsx';
import { lugarEnFila } from './disposicion.ts';
import { estadoDePrueba, estadoDePruebaConParametros, type EstadoEscena } from './estado.ts';
import { yPiso } from './medidas.ts';
import { Pasillo } from './Pasillo.tsx';
import { Persona3D } from './Persona3D.tsx';
import { Torre } from './Torre.tsx';
import { poseExterior } from './vistas.ts';

/** Personas que se dibujan como máximo por piso (la parte 3 pone el rótulo «+N personas» con el resto). */
const MAX_POR_PISO = 12;

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
  const restablecer = useEscena((s) => s.restablecer);
  const sinMovimiento = useSinMovimiento();
  const estado = useMemo<EstadoEscena>(
    () => (import.meta.env.DEV ? estadoDePruebaConParametros(window.location.search) : estadoDePrueba()),
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
      <Torre cabina={estado.cabina} />
      <Filas filas={estado.filas} />
      {vista === 'piso' && <Pasillo piso={piso} />}
      <Camara vista={vista} piso={piso} restablecer={restablecer} sinMovimiento={sinMovimiento} />
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

/** Quienes esperan en el vestíbulo de cada piso, frente a la puerta. */
function Filas({ filas }: { filas: EstadoEscena['filas'] }) {
  return (
    <group>
      {filas.flatMap((fila, piso) =>
        fila.slice(0, MAX_POR_PISO).map((p, i) => {
          const lugar = lugarEnFila(i, p.id);
          return <Persona3D key={p.id} id={p.id} tipo={p.tipo} posicion={[lugar.x, yPiso(piso), lugar.z]} giro={lugar.giro} />;
        }),
      )}
    </group>
  );
}
