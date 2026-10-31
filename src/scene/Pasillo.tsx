// Pasillo sencillo del piso elegido, solo en la vista desde un piso: piso, paredes, techo con su lámpara, el
// número del piso, la botonera de llamada junto a la puerta, la puerta de las escaleras, una banca y una maceta.

import { PALETA } from './paleta.ts';
import { Caja } from './piezas.tsx';
import {
  ALTURA_PISO,
  DECORACION,
  GROSOR_LOSA,
  PARED_DERECHA_Z,
  PARED_IZQUIERDA_Z,
  PASILLO,
  PUERTA,
  TORRE,
  etiquetaPiso,
  yPiso,
} from './medidas.ts';
import { useRotulo } from './rotulos.ts';

const LARGO = PASILLO.x1 - PASILLO.x0;
const X_CENTRO = (PASILLO.x0 + PASILLO.x1) / 2;
const ALTO_LIBRE = ALTURA_PISO - GROSOR_LOSA;
const GROSOR_PARED = 0.14;
const Z_IZQUIERDA = PARED_IZQUIERDA_Z;
const Z_DERECHA = PARED_DERECHA_Z;

export function Pasillo({ piso }: { piso: number }) {
  const y = yPiso(piso);
  return (
    <group position={[0, y, 0]}>
      <Estructura />
      <Decoracion piso={piso} />
      <BotoneraDeLlamada />
      <pointLight position={[-1.8, ALTO_LIBRE - 0.5, TORRE.zc]} intensity={2.6} distance={12} decay={1} color="#FFF3E0" />
    </group>
  );
}

function Estructura() {
  return (
    <group>
      {/* Piso y techo (el techo es la losa del piso de arriba). */}
      <Caja posicion={[X_CENTRO, -GROSOR_LOSA / 2, TORRE.zc]} tam={[LARGO, GROSOR_LOSA, TORRE.ancho]} color={PALETA.grisClaro} radio={0.05} />
      <Caja posicion={[X_CENTRO, ALTURA_PISO - GROSOR_LOSA / 2 - 0.0, TORRE.zc]} tam={[LARGO, GROSOR_LOSA, TORRE.ancho]} color={PALETA.blanco} radio={0.05} />
      {/* Paredes: izquierda, derecha (la fachada, por dentro) y la del fondo, detrás de quien mira. */}
      <Caja posicion={[X_CENTRO, ALTO_LIBRE / 2, Z_IZQUIERDA - GROSOR_PARED / 2]} tam={[LARGO, ALTO_LIBRE, GROSOR_PARED]} color={PALETA.crema} radio={0.04} />
      <Caja posicion={[X_CENTRO, ALTO_LIBRE / 2, Z_DERECHA + GROSOR_PARED / 2]} tam={[LARGO, ALTO_LIBRE, GROSOR_PARED]} color={PALETA.crema} radio={0.04} />
      <Caja posicion={[PASILLO.x0 - GROSOR_PARED / 2, ALTO_LIBRE / 2, TORRE.zc]} tam={[GROSOR_PARED, ALTO_LIBRE, TORRE.ancho + 2 * GROSOR_PARED]} color={PALETA.crema} radio={0.04} />
      {/* Zócalos. */}
      <Caja posicion={[X_CENTRO, 0.12, Z_IZQUIERDA + 0.03]} tam={[LARGO, 0.24, 0.06]} color={PALETA.durazno} radio={0.02} sombra={false} />
      <Caja posicion={[X_CENTRO, 0.12, Z_DERECHA - 0.03]} tam={[LARGO, 0.24, 0.06]} color={PALETA.durazno} radio={0.02} sombra={false} />
      {/* Lámpara del techo. */}
      <Caja posicion={[-1.8, ALTO_LIBRE - 0.05, TORRE.zc]} tam={[1.2, 0.08, 0.5]} color={PALETA.blanco} radio={0.03} sombra={false} />
    </group>
  );
}

function Decoracion({ piso }: { piso: number }) {
  const numero = useRotulo(etiquetaPiso(piso), { fondo: PALETA.azul, tinta: PALETA.blanco, ancho: 160, alto: 160, radio: 36 });
  const escaleras = useRotulo('Escaleras', { fondo: PALETA.verdeOscuro, tinta: PALETA.blanco, ancho: 384, alto: 96 });
  const { escaleras: e, numero: n, banca: b, maceta: m } = DECORACION;
  return (
    <group>
      {/* Pared izquierda: la puerta de las escaleras y una maceta. */}
      <Caja posicion={[e.x, e.alto / 2, Z_IZQUIERDA + 0.04]} tam={[e.ancho, e.alto, 0.08]} color={PALETA.pizarra} radio={0.04} />
      <Caja posicion={[e.x + e.ancho * 0.35, e.alto / 2, Z_IZQUIERDA + 0.1]} tam={[0.08, 0.08, 0.06]} color={PALETA.amarillo} radio={0.02} sombra={false} />
      {escaleras && (
        <mesh position={[e.x, e.letreroY, Z_IZQUIERDA + 0.02]}>
          <planeGeometry args={[e.ancho, e.letreroAlto]} />
          <meshBasicMaterial map={escaleras} toneMapped={false} transparent />
        </mesh>
      )}
      <group position={[m.x, 0, Z_IZQUIERDA + 0.4]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.17, 0.4, 8]} />
          <meshStandardMaterial color={PALETA.cobre} roughness={0.95} flatShading />
        </mesh>
        <mesh position={[0, 0.7, 0]} castShadow>
          <icosahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial color={PALETA.verde} roughness={0.95} flatShading />
        </mesh>
      </group>
      {/* Pared derecha: el número del piso sobre una banca. */}
      {numero && (
        <mesh position={[n.x, n.y, Z_DERECHA - 0.01]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[n.lado, n.lado]} />
          <meshBasicMaterial map={numero} toneMapped={false} transparent />
        </mesh>
      )}
      <group position={[b.x, 0, Z_DERECHA - 0.35]}>
        <Caja posicion={[0, b.alto - 0.08, 0]} tam={[b.ancho, 0.12, b.fondo]} color={PALETA.ladrillo} radio={0.04} />
        <Caja posicion={[-(b.ancho / 2 - 0.1), 0.18, 0]} tam={[0.12, 0.36, 0.36]} color={PALETA.pizarra} radio={0.03} />
        <Caja posicion={[b.ancho / 2 - 0.1, 0.18, 0]} tam={[0.12, 0.36, 0.36]} color={PALETA.pizarra} radio={0.03} />
      </group>
    </group>
  );
}

/** Placa de llamada junto a la puerta: dos botones (subir y bajar), con el de arriba encendido. */
function BotoneraDeLlamada() {
  const x = TORRE.xPuertas - 0.14;
  const z = TORRE.zc + PUERTA.ancho / 2 + 0.45;
  return (
    <group position={[x, 1.05, z]}>
      <Caja posicion={[0, 0, 0]} tam={[0.08, 0.62, 0.3]} color={PALETA.negro} radio={0.03} />
      <mesh position={[-0.06, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
        <meshStandardMaterial color={PALETA.amarillo} emissive={PALETA.amarillo} emissiveIntensity={0.35} roughness={0.9} />
      </mesh>
      <mesh position={[-0.06, -0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.05, 16]} />
        <meshStandardMaterial color={PALETA.crema} roughness={0.9} />
      </mesh>
    </group>
  );
}
