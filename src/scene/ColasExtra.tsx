// El rótulo «+N personas» sobre el vestíbulo de cada piso donde esperan más personas de las que se dibujan. Es un
// sprite (mira siempre a la cámara) con un canvas que se vuelve a dibujar solo cuando cambia N.

import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { CanvasTexture, SRGBColorSpace, type Group, type Sprite, type SpriteMaterial } from 'three';
import type { Manejadores } from './manejadores.ts';
import { ALTURA_PISO, GROSOR_LOSA, TORRE, PISO_MAXIMO, yPiso } from './medidas.ts';
import { PALETA } from './paleta.ts';
import { dibujarRotulo, fuentesListas, type OpcionesRotulo } from './rotulos.ts';

const PISOS = Array.from({ length: PISO_MAXIMO + 1 }, (_, i) => i);
const ANCHO = 2;
const OPCIONES: OpcionesRotulo = { fondo: PALETA.amarillo, tinta: PALETA.negro, ancho: 384, alto: 112, radio: 30 };
const ALTO = (ANCHO * OPCIONES.alto) / OPCIONES.ancho;
/** Sobre las últimas hileras, del lado del vidrio del frente, por encima de las cabezas y bajo el indicador. */
const X_CARTEL = TORRE.x0 + 1.1;
const Z_CARTEL = TORRE.zc + 1.25;
/** Borde de arriba del cartel y techo del piso (cara de abajo de la losa de arriba), sobre el piso terminado. */
const Y_CARTEL = 1.95;
const Y_TECHO_PISO = ALTURA_PISO - GROSOR_LOSA;

export const textoDeExtras = (n: number): string => (n === 1 ? '+1 persona' : `+${n} personas`);

export function ColasExtra({ manejadores }: { manejadores: Manejadores }) {
  const invalidar = useThree((s) => s.invalidate);
  const sprites = useRef<(Sprite | null)[]>([]);
  const carteles = useRef<(Group | null)[]>([]);

  useEffect(() => {
    let vivo = true;
    const texturas: CanvasTexture[] = [];
    void fuentesListas().then(() => {
      if (!vivo) return;
      PISOS.forEach((piso) => {
        const sprite = sprites.current[piso];
        const cartel = carteles.current[piso];
        if (!sprite || !cartel) return;
        const canvas = document.createElement('canvas');
        const textura = new CanvasTexture(canvas);
        textura.colorSpace = SRGBColorSpace;
        texturas.push(textura);
        (sprite.material as SpriteMaterial).map = textura;
        let ultimo = -1;
        manejadores.colasExtra[piso] = {
          poner(n: number) {
            if (n === ultimo) return;
            ultimo = n;
            cartel.visible = n > 0;
            if (n > 0) {
              dibujarRotulo(canvas, textoDeExtras(n), OPCIONES);
              textura.needsUpdate = true;
            }
          },
        };
      });
      // Se aplica lo último que había pedido la escena.
      manejadores._claveGente = '';
      invalidar();
    });
    return () => {
      vivo = false;
      manejadores.colasExtra.fill(null);
      texturas.forEach((t) => t.dispose());
    };
  }, [manejadores, invalidar]);

  // Cartel colgado del techo a un lado del vestíbulo, sobre el final de la fila: opaco (no deja ver nada a través) y
  // fuera del eje de la puerta, para no tapar el indicador de piso. El alto de las personas es 1,2.
  return (
    <group>
      {PISOS.map((piso) => (
        <group
          key={piso}
          visible={false}
          position={[X_CARTEL, yPiso(piso), Z_CARTEL]}
          ref={(g) => {
            carteles.current[piso] = g;
          }}
        >
          <mesh position={[0, (Y_CARTEL + Y_TECHO_PISO) / 2, 0]}>
            <boxGeometry args={[0.07, Y_TECHO_PISO - Y_CARTEL, 0.07]} />
            <meshStandardMaterial color={PALETA.gris} roughness={0.95} />
          </mesh>
          <sprite position={[0, Y_CARTEL - ALTO / 2, 0]} scale={[ANCHO, ALTO, 1]} ref={(s) => { sprites.current[piso] = s; }}>
            <spriteMaterial alphaTest={0.5} toneMapped={false} />
          </sprite>
        </group>
      ))}
    </group>
  );
}
