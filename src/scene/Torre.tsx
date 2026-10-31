// La torre de vidrio con el único ascensor: losas del vestíbulo, vidrio con su marco, la pared de puertas con una
// puerta por piso, el indicador sobre cada puerta, los rótulos de los pisos y la cabina de cristal.

import { useMemo } from 'react';
import { ExtrudeGeometry, Shape, type CanvasTexture } from 'three';
import type { EstadoEscena } from './estado.ts';
import { lugarEnCabina } from './disposicion.ts';
import {
  CABINA,
  GROSOR_PARED_POZO,
  PISO_MAXIMO,
  PISO_SIN_ACCESO,
  PISO_SOTANO,
  PUERTA,
  TORRE,
  Y_FONDO,
  Y_TECHO,
  etiquetaPiso,
  pisoDeCabina,
  yPiso,
} from './medidas.ts';
import { PALETA } from './paleta.ts';
import { Persona3D } from './Persona3D.tsx';
import { Caja, CajasInstanciadas, Vidrio, type Instancia } from './piezas.tsx';
import { useRotulo } from './rotulos.ts';
import type { Vec3 } from './vistas.ts';

const PISOS_CON_PUERTA = Array.from({ length: PISO_MAXIMO + 1 }, (_, i) => i);
const PISOS_CON_LOSA = Array.from({ length: PISO_SIN_ACCESO + 1 }, (_, i) => i);
const ALTO_TORRE = Y_TECHO - Y_FONDO;
const Y_MEDIO = (Y_TECHO + Y_FONDO) / 2;
/** Cada hoja de puerta mide la mitad del hueco y, al abrir, se corre esto detrás de la jamba. */
const HOJA = PUERTA.ancho / 2;
/** Grosor de los marcos del vidrio. */
const GROSOR_MARCO = 0.2;

export function Torre({ cabina }: { cabina: EstadoEscena['cabina'] }) {
  const enPiso = pisoDeCabina(cabina.piso);
  const flecha = cabina.sentido;
  const rotuloPiso = enPiso !== null ? etiquetaPiso(enPiso) : etiquetaPiso(Math.round(cabina.piso));
  const textoIndicador = useRotulo(rotuloPiso, { fondo: PALETA.negro, tinta: PALETA.amarillo, ancho: 256, alto: 72, flecha });
  return (
    <group>
      <VidrioDeLaTorre />
      <Losas />
      <ParedDePuertas />
      {PISOS_CON_PUERTA.map((piso) => (
        <group key={piso}>
          <HojasDePuerta x={TORRE.xPuertas + 0.05} y={yPiso(piso)} abertura={piso === enPiso ? cabina.puertas : 0} color={PALETA.blancoSombra} />
          <IndicadorSobrePuerta piso={piso} textura={textoIndicador} />
          <RotuloPiso piso={piso} />
        </group>
      ))}
      <Caja posicion={[CABINA.xCentro, Y_FONDO - 0.15, TORRE.zc]} tam={[4.1, 0.3, TORRE.ancho]} color={PALETA.pizarra} radio={0.05} />
      <Cabina cabina={cabina} />
      <RotuloSinAcceso />
    </group>
  );
}

/** Paneles de vidrio de frente, de atrás y de la derecha, con su marco de barras delgadas. */
function VidrioDeLaTorre() {
  const { barras } = useMemo(() => {
    const barras: Instancia[] = [];
    const xs = [TORRE.x0, TORRE.xPuertas, TORRE.x1];
    const zs = [TORRE.z0, TORRE.zc, TORRE.z1];
    const g = GROSOR_MARCO;
    for (const piso of PISOS_CON_LOSA) {
      const y = yPiso(piso);
      barras.push(
        { posicion: [4, y, TORRE.z1], tam: [8 + g, g, g] },
        { posicion: [4, y, TORRE.z0], tam: [8 + g, g, g] },
        { posicion: [TORRE.x1, y, TORRE.zc], tam: [g, g, TORRE.ancho + g] },
      );
    }
    for (const x of xs) {
      barras.push(
        { posicion: [x, Y_MEDIO, TORRE.z1], tam: [g, ALTO_TORRE, g] },
        { posicion: [x, Y_MEDIO, TORRE.z0], tam: [g, ALTO_TORRE, g] },
      );
    }
    for (const z of zs) barras.push({ posicion: [TORRE.x1, Y_MEDIO, z], tam: [g, ALTO_TORRE, g] });
    return { barras };
  }, []);
  return (
    <group>
      <Vidrio posicion={[4, Y_MEDIO, TORRE.z1]} tam={[TORRE.x1 - TORRE.x0, ALTO_TORRE]} />
      <Vidrio posicion={[4, Y_MEDIO, TORRE.z0]} tam={[TORRE.x1 - TORRE.x0, ALTO_TORRE]} />
      <Vidrio posicion={[TORRE.x1, Y_MEDIO, TORRE.zc]} tam={[TORRE.ancho, ALTO_TORRE]} rotacionY={Math.PI / 2} />
      <CajasInstanciadas instancias={barras} color={PALETA.gris} />
      {/* Tapa de la torre. */}
      <Caja posicion={[4, Y_TECHO + 0.15, TORRE.zc]} tam={[8.4, 0.3, TORRE.ancho + 0.4]} color={PALETA.crema} radio={0.1} />
    </group>
  );
}

/** Losa del vestíbulo de cada piso (el suelo donde se espera). El sótano va más oscuro. */
function Losas() {
  return (
    <group>
      {PISOS_CON_LOSA.map((piso) => (
        <Caja
          key={piso}
          posicion={[(TORRE.x0 + TORRE.xPuertas) / 2, yPiso(piso) - 0.11, TORRE.zc]}
          tam={[TORRE.xPuertas - TORRE.x0, 0.22, TORRE.ancho]}
          color={piso === PISO_SOTANO ? PALETA.gris : PALETA.grisClaro}
          radio={0.06}
        />
      ))}
    </group>
  );
}

/**
 * La pared del pozo que da al vestíbulo: una sola pieza con un hueco de puerta por piso, de S a P9. En P10 no hay
 * hueco (sin acceso).
 */
function ParedDePuertas() {
  const geometria = useMemo(() => {
    const forma = new Shape();
    forma.moveTo(0, 0);
    forma.lineTo(TORRE.ancho, 0);
    forma.lineTo(TORRE.ancho, ALTO_TORRE);
    forma.lineTo(0, ALTO_TORRE);
    forma.closePath();
    const centro = TORRE.ancho / 2;
    for (const piso of PISOS_CON_PUERTA) {
      const v0 = yPiso(piso) - Y_FONDO;
      const hueco = new Shape();
      hueco.moveTo(centro - PUERTA.ancho / 2, v0);
      hueco.lineTo(centro + PUERTA.ancho / 2, v0);
      hueco.lineTo(centro + PUERTA.ancho / 2, v0 + PUERTA.alto);
      hueco.lineTo(centro - PUERTA.ancho / 2, v0 + PUERTA.alto);
      hueco.closePath();
      forma.holes.push(hueco);
    }
    return new ExtrudeGeometry(forma, { depth: GROSOR_PARED_POZO, bevelEnabled: false });
  }, []);
  // La forma tiene x = ancho de la torre (a lo largo de z), y = altura y se extruye hacia −x al girarla.
  return (
    <mesh geometry={geometria} position={[TORRE.xPuertas, Y_FONDO, TORRE.z0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={PALETA.grisClaro} roughness={0.95} />
    </mesh>
  );
}

/** Las dos hojas de una puerta, que se corren hacia los lados detrás de las jambas. */
function HojasDePuerta({ x, y, abertura, color }: { x: number; y: number; abertura: number; color: string }) {
  const corrimiento = Math.min(1, Math.max(0, abertura)) * HOJA;
  return (
    <group>
      {[-1, 1].map((lado) => (
        <Caja
          key={lado}
          posicion={[x, y + PUERTA.alto / 2, TORRE.zc + lado * (HOJA / 2 + corrimiento)]}
          tam={[0.07, PUERTA.alto - 0.02, HOJA - 0.02]}
          color={color}
          radio={0.025}
          sombra={false}
        />
      ))}
    </group>
  );
}

/** Placa con el piso en que está la cabina, sobre la puerta de cada piso. */
function IndicadorSobrePuerta({ piso, textura }: { piso: number; textura: CanvasTexture | null }) {
  if (piso === PISO_SIN_ACCESO) return null;
  const xPlaca = TORRE.xPuertas - GROSOR_PARED_POZO - 0.04;
  const y = yPiso(piso) + PUERTA.alto + 0.28;
  return (
    <group>
      <Caja posicion={[xPlaca, y, TORRE.zc]} tam={[0.08, 0.4, 1.4]} color={PALETA.negro} radio={0.03} sombra={false} />
      {textura && (
        <mesh position={[xPlaca - 0.045, y, TORRE.zc]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[1.32, 0.37]} />
          <meshBasicMaterial map={textura} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** Rótulo del piso (S, P1…P9) en el vidrio del frente, junto al bloque. */
function RotuloPiso({ piso }: { piso: number }) {
  const textura = useRotulo(etiquetaPiso(piso), {
    fondo: piso === PISO_SOTANO ? PALETA.gris : PALETA.crema,
    tinta: PALETA.pizarra,
    ancho: 128,
    alto: 72,
  });
  if (!textura) return null;
  return (
    <mesh position={[0.62, yPiso(piso) + 0.5, TORRE.z1 + 0.04]}>
      <planeGeometry args={[0.8, 0.45]} />
      <meshBasicMaterial map={textura} toneMapped={false} transparent />
    </mesh>
  );
}

/** El letrero de P10: el ascensor no llega a ese piso. */
function RotuloSinAcceso() {
  const textura = useRotulo('P10, sin acceso', { fondo: PALETA.rojo, tinta: PALETA.blanco, ancho: 640, alto: 112 });
  if (!textura) return null;
  return (
    <group position={[4, yPiso(PISO_SIN_ACCESO) + 1.35, TORRE.z1 + 0.04]}>
      <mesh>
        <planeGeometry args={[5.2, 0.91]} />
        <meshBasicMaterial map={textura} toneMapped={false} transparent />
      </mesh>
    </group>
  );
}

/** Cabina de cristal con las personas que lleva. Su origen es el centro de su piso. */
function Cabina({ cabina }: { cabina: EstadoEscena['cabina'] }) {
  const { fondo, ancho, alto, pared } = CABINA;
  const y = yPiso(cabina.piso) + 0.02;
  const xFrente = -(fondo / 2 + pared / 2);
  const xFondo = fondo / 2 + pared / 2;
  const zLado = ancho / 2 + pared / 2;
  const posiciones = useMemo<Vec3[]>(
    () => cabina.ocupantes.slice(0, 10).map((_, i) => [lugarEnCabina(i).x, 0, lugarEnCabina(i).z]),
    [cabina.ocupantes],
  );
  const corrimiento = Math.min(1, Math.max(0, cabina.puertas)) * HOJA;
  return (
    <group position={[CABINA.xCentro, y, TORRE.zc]}>
      <Caja posicion={[0, -0.05, 0]} tam={[fondo + 2 * pared, 0.1, ancho + 2 * pared]} color={PALETA.gris} radio={0.04} />
      <Caja posicion={[0, alto + 0.05, 0]} tam={[fondo + 2 * pared, 0.1, ancho + 2 * pared]} color={PALETA.crema} radio={0.04} sombra={false} />
      {/* Postes de las esquinas. */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Caja
            key={`${sx}${sz}`}
            posicion={[sx * xFondo, alto / 2, sz * zLado]}
            tam={[pared, alto, pared]}
            color={PALETA.pizarra}
            radio={0.03}
            sombra={false}
          />
        )),
      )}
      {/* Vidrio de atrás y de los lados. */}
      <Vidrio posicion={[xFondo, alto / 2, 0]} tam={[ancho, alto]} rotacionY={Math.PI / 2} opacidad={0.22} />
      <Vidrio posicion={[0, alto / 2, zLado]} tam={[fondo, alto]} opacidad={0.22} />
      <Vidrio posicion={[0, alto / 2, -zLado]} tam={[fondo, alto]} opacidad={0.22} />
      {/* Pasamanos al fondo. */}
      <Caja posicion={[fondo / 2 - 0.08, 0.85, 0]} tam={[0.06, 0.06, ancho - 0.3]} color={PALETA.gris} radio={0.025} sombra={false} />
      {/* Frente: dos jambas y las dos hojas de la puerta de la cabina. */}
      {[-1, 1].map((lado) => (
        <group key={lado}>
          <Caja
            posicion={[xFrente, alto / 2, lado * (PUERTA.ancho / 2 + (ancho / 2 - PUERTA.ancho / 2) / 2)]}
            tam={[pared, alto, ancho / 2 - PUERTA.ancho / 2]}
            color={PALETA.grisClaro}
            radio={0.03}
          />
          <Caja
            posicion={[xFrente + pared * 0.9, alto / 2, lado * (HOJA / 2 + corrimiento)]}
            tam={[0.07, alto - 0.04, HOJA - 0.02]}
            color={PALETA.blancoSombra}
            radio={0.025}
            sombra={false}
          />
        </group>
      ))}
      {cabina.ocupantes.slice(0, 10).map((p, i) => (
        <Persona3D key={p.id} id={p.id} tipo={p.tipo} posicion={posiciones[i]} giro={lugarEnCabina(i).giro} />
      ))}
    </group>
  );
}
