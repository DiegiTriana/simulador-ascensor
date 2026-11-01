// Mide los cuadros por segundo mientras la escena se dibuja y, si bajan de 30 de forma sostenida, baja un nivel de
// calidad (sombras fuera, después menos resolución). No dibuja nada.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { useCalidad } from '../store/calidad.ts';
import { crearMedidor } from './calidad.ts';

export function CalidadAdaptable() {
  const medidor = useMemo(crearMedidor, []);
  const nivel = useCalidad((s) => s.nivel);
  const bajar = useCalidad((s) => s.bajar);

  // Al cambiar de nivel se vuelve a medir desde cero: lo anterior era de otra calidad.
  useEffect(() => medidor.reiniciar(), [medidor, nivel]);

  // `delta` mide desde el cuadro anterior; con la escena quieta (frameloop a pedido) un cuadro largo es una pausa y el
  // medidor lo descarta.
  useFrame((_, delta) => {
    if (medidor.cuadro(delta)) bajar();
  });
  return null;
}
