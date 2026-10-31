// Rótulos de la escena (números de piso, «sin acceso», indicador sobre la puerta): se dibujan en un canvas
// con Atkinson y se usan como textura de un plano. Son letras sobre un color plano, no fotografías.

import { useEffect, useState } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

export interface OpcionesRotulo {
  /** Relleno de la placa; null deja el fondo transparente. */
  fondo: string | null;
  tinta: string;
  /** Tamaño del canvas en píxeles (la proporción debe ser la del plano). */
  ancho: number;
  alto: number;
  /** Radio de las esquinas de la placa, en píxeles. */
  radio?: number;
  /** Flecha a la izquierda del texto: −1 baja, 1 sube, 0 (o sin poner) no lleva. */
  flecha?: -1 | 0 | 1;
}

const FUENTE = '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif';

/** Espera a que Atkinson esté lista (si no se carga, se sigue con la fuente de respaldo). */
export function fuentesListas(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  return document.fonts.load(`700 40px ${FUENTE}`).then(
    () => undefined,
    () => undefined,
  );
}

export function crearRotulo(texto: string, op: OpcionesRotulo): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = op.ancho;
  canvas.height = op.alto;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (op.fondo) {
      ctx.fillStyle = op.fondo;
      ctx.beginPath();
      ctx.roundRect(0, 0, op.ancho, op.alto, op.radio ?? op.alto * 0.25);
      ctx.fill();
    }
    ctx.fillStyle = op.tinta;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const flecha = op.flecha ?? 0;
    // Con flecha, el texto ocupa la parte derecha de la placa.
    const centroX = flecha === 0 ? op.ancho / 2 : op.ancho * 0.6;
    let tamano = op.alto * 0.62;
    ctx.font = `700 ${tamano}px ${FUENTE}`;
    const maximo = (flecha === 0 ? op.ancho : op.ancho * 0.7) * 0.88;
    const medida = ctx.measureText(texto).width;
    if (medida > maximo) {
      tamano *= maximo / medida;
      ctx.font = `700 ${tamano}px ${FUENTE}`;
    }
    // El centro óptico de las mayúsculas queda un poco por encima del centro de la línea.
    ctx.fillText(texto, centroX, op.alto / 2 + tamano * 0.04);
    if (flecha !== 0) {
      const lado = op.alto * 0.36;
      const cx = op.ancho * 0.2;
      const cy = op.alto / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - flecha * lado * 0.6);
      ctx.lineTo(cx - lado * 0.7, cy + flecha * lado * 0.5);
      ctx.lineTo(cx + lado * 0.7, cy + flecha * lado * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }
  const textura = new CanvasTexture(canvas);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

/** Textura de un rótulo; es null hasta que la fuente está lista. Se libera sola al cambiar o desmontar. */
export function useRotulo(texto: string, op: OpcionesRotulo): CanvasTexture | null {
  const [textura, poner] = useState<CanvasTexture | null>(null);
  const clave = `${texto}|${op.fondo}|${op.tinta}|${op.ancho}|${op.alto}|${op.radio ?? ''}|${op.flecha ?? 0}`;
  useEffect(() => {
    let vivo = true;
    let propia: CanvasTexture | null = null;
    void fuentesListas().then(() => {
      if (!vivo) return;
      propia = crearRotulo(texto, op);
      poner(propia);
    });
    return () => {
      vivo = false;
      propia?.dispose();
    };
    // `op` se describe por completo en `clave`.
  }, [clave]);
  return textura;
}
