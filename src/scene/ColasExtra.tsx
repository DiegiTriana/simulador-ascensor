// El rótulo «+N personas» sobre el vestíbulo de cada piso donde esperan más personas de las que se dibujan. Es un
// sprite (mira siempre a la cámara) con un canvas que se vuelve a dibujar solo cuando cambia N.

import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { CanvasTexture, SRGBColorSpace, type Sprite, type SpriteMaterial } from 'three';
import type { Manejadores } from './manejadores.ts';
import { TORRE, PISO_MAXIMO, yPiso } from './medidas.ts';
import { PALETA } from './paleta.ts';
import { dibujarRotulo, fuentesListas, type OpcionesRotulo } from './rotulos.ts';

const PISOS = Array.from({ length: PISO_MAXIMO + 1 }, (_, i) => i);
const ANCHO = 2.1;
const OPCIONES: OpcionesRotulo = { fondo: PALETA.amarillo, tinta: PALETA.negro, ancho: 384, alto: 112, radio: 30 };

export const textoDeExtras = (n: number): string => (n === 1 ? '+1 persona' : `+${n} personas`);

export function ColasExtra({ manejadores }: { manejadores: Manejadores }) {
  const invalidar = useThree((s) => s.invalidate);
  const sprites = useRef<(Sprite | null)[]>([]);

  useEffect(() => {
    let vivo = true;
    const texturas: CanvasTexture[] = [];
    void fuentesListas().then(() => {
      if (!vivo) return;
      PISOS.forEach((piso) => {
        const sprite = sprites.current[piso];
        if (!sprite) return;
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
            sprite.visible = n > 0;
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

  return (
    <group>
      {PISOS.map((piso) => (
        <sprite
          key={piso}
          visible={false}
          position={[TORRE.x0 + 1.2, yPiso(piso) + 1.75, TORRE.zc]}
          scale={[ANCHO, (ANCHO * OPCIONES.alto) / OPCIONES.ancho, 1]}
          ref={(s) => {
            sprites.current[piso] = s;
          }}
        >
          <spriteMaterial transparent depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}
