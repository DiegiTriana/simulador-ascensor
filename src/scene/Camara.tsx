// Cámara de la escena: la vista exterior se puede girar y acercar con límites; la vista desde un piso es fija.
// Al cambiar de vista la cámara se desliza en menos de 1 s (de inmediato con «reducir movimiento»). Cambiar de
// piso en la vista desde un piso recoloca la cámara sin deslizarla. Nada de esto toca la simulación.

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { MathUtils, PerspectiveCamera, TOUCH, Vector3 } from 'three';
import { limitesExterior, poseDe, type Pose, type Vista } from './vistas.ts';

const DURACION_S = 0.8;
const suave = (t: number) => t * t * (3 - 2 * t);

interface Props {
  vista: Vista;
  piso: number;
  /** Cambia cada vez que se pide volver a la cámara de origen. */
  restablecer: number;
  sinMovimiento: boolean;
}

interface Deslizamiento {
  desde: Pose;
  hacia: Pose;
  /** Marca de tiempo (ms) en que empezó. Con `frameloop="demand"` el `delta` de un cuadro incluye todo el tiempo quieto. */
  inicio: number;
}

function poseActual(camara: PerspectiveCamera, objetivo: Vector3): Pose {
  return {
    posicion: [camara.position.x, camara.position.y, camara.position.z],
    objetivo: [objetivo.x, objetivo.y, objetivo.z],
    fov: camara.fov,
  };
}

export function Camara({ vista, piso, restablecer, sinMovimiento }: Props) {
  const camara = useThree((s) => s.camera) as PerspectiveCamera;
  const lienzo = useThree((s) => s.gl.domElement);
  const aspecto = useThree((s) => s.size.width / s.size.height);
  const invalidar = useThree((s) => s.invalidate);
  const controles = useRef<ComponentRef<typeof OrbitControls>>(null);
  const objetivo = useRef(new Vector3());
  const deslizando = useRef<Deslizamiento | null>(null);
  const previa = useRef<{ vista: Vista; piso: number; restablecer: number; aspecto: number } | null>(null);
  const tocada = useRef(false);
  // Mientras la cámara se desliza, los controles quedan quietos: si no, sus límites de distancia la frenarían.
  const [deslizandoAhora, setDeslizandoAhora] = useState(false);

  const colocar = (pose: Pose) => {
    camara.position.set(...pose.posicion);
    objetivo.current.set(...pose.objetivo);
    camara.fov = pose.fov;
    camara.updateProjectionMatrix();
    controles.current?.target.copy(objetivo.current);
    camara.lookAt(objetivo.current);
    invalidar();
  };

  // Al cambiar de vista, de piso, al pedir restablecer o al cambiar la forma del lienzo, la cámara va a su pose.
  useEffect(() => {
    const anterior = previa.current;
    previa.current = { vista, piso, restablecer, aspecto };
    const destino = poseDe(vista, piso, aspecto);
    if (!anterior) {
      colocar(destino);
      return;
    }
    const cambioDeVista = anterior.vista !== vista;
    const pideRestablecer = anterior.restablecer !== restablecer;
    if (cambioDeVista || pideRestablecer) {
      tocada.current = false;
      if (sinMovimiento) {
        deslizando.current = null;
        colocar(destino);
      } else {
        deslizando.current = { desde: poseActual(camara, objetivo.current), hacia: destino, inicio: performance.now() };
        setDeslizandoAhora(true);
        invalidar();
      }
      return;
    }
    // Otro piso, o el lienzo cambió de forma: recolocar, sin deslizar. En la exterior solo si nadie movió la cámara.
    if (vista === 'piso' || !tocada.current) {
      deslizando.current = null;
      colocar(destino);
    }
    // `colocar` solo usa refs y objetos de three, que no cambian.
  }, [vista, piso, restablecer, aspecto, sinMovimiento]);

  useFrame(() => {
    const d = deslizando.current;
    if (!d) return;
    const t = Math.min(1, (performance.now() - d.inicio) / (DURACION_S * 1000));
    const k = suave(t);
    const mezcla = (a: [number, number, number], b: [number, number, number]) =>
      new Vector3(...a).lerp(new Vector3(...b), k);
    camara.position.copy(mezcla(d.desde.posicion, d.hacia.posicion));
    objetivo.current.copy(mezcla(d.desde.objetivo, d.hacia.objetivo));
    camara.fov = MathUtils.lerp(d.desde.fov, d.hacia.fov, k);
    camara.updateProjectionMatrix();
    controles.current?.target.copy(objetivo.current);
    camara.lookAt(objetivo.current);
    if (t >= 1) {
      deslizando.current = null;
      setDeslizandoAhora(false);
    }
    invalidar();
  });

  // En pantallas táctiles, un dedo desplaza la página (no gira la escena): solo el eje horizontal llega a la escena.
  useEffect(() => {
    const antes = lienzo.style.touchAction;
    lienzo.style.touchAction = 'pan-y';
    return () => {
      lienzo.style.touchAction = antes;
    };
  }, [lienzo]);

  const limites = limitesExterior(aspecto);
  const exterior = vista === 'exterior';
  return (
    <OrbitControls
      ref={controles}
      makeDefault
      enabled={exterior && !deslizandoAhora}
      enableDamping={!sinMovimiento}
      dampingFactor={0.12}
      enablePan
      screenSpacePanning
      zoomToCursor
      minAzimuthAngle={limites.azimutMin}
      maxAzimuthAngle={limites.azimutMax}
      minPolarAngle={limites.polarMin}
      maxPolarAngle={limites.polarMax}
      minDistance={limites.distanciaMin}
      maxDistance={limites.distanciaMax}
      touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
      onStart={() => {
        tocada.current = true;
      }}
      onChange={() => {
        // El punto que mira la cámara no sale de la caja del edificio.
        const c = controles.current;
        if (!c) return;
        c.target.clamp(new Vector3(...limites.objetivoMin), new Vector3(...limites.objetivoMax));
      }}
    />
  );
}
