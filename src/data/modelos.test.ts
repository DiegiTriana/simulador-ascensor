import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ALTURA_PERSONA,
  ARCHIVOS_MODELOS,
  CABINA_DIBUJADA,
  CAPACIDAD_CABINA,
  CLIPS_ASEO,
  CLIPS_ESTUDIANTE,
  ESTUDIANTES,
  MODELO_ASEO,
  MODELO_MULETA,
  MODELO_SILLA,
  TEXTURA_MODELOS,
  estudiantePorNumero,
} from './modelos.ts';

const CARPETA = resolve(import.meta.dirname, '../../public/modelos');

/** Lee el JSON de un GLB: cabecera de 12 bytes, luego el trozo JSON (largo, tipo, datos). */
function jsonDe(archivo: string) {
  const b = readFileSync(resolve(CARPETA, archivo));
  expect(b.readUInt32LE(0)).toBe(0x46546c67); // «glTF»
  expect(b.readUInt32LE(4)).toBe(2);
  expect(b.readUInt32LE(8)).toBe(b.length);
  return JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8'));
}

describe('estudiantePorNumero', () => {
  it('elige por el número de la persona y da vueltas por los 6 modelos', () => {
    expect(estudiantePorNumero(0)).toBe(ESTUDIANTES[0]);
    expect(estudiantePorNumero(5)).toBe(ESTUDIANTES[5]);
    expect(estudiantePorNumero(6)).toBe(ESTUDIANTES[0]);
    expect(estudiantePorNumero(1000)).toBe(ESTUDIANTES[1000 % 6]);
  });

  it('da el mismo modelo para el mismo número', () => {
    for (let n = 0; n < 50; n++) expect(estudiantePorNumero(n)).toBe(estudiantePorNumero(n));
  });

  it('rechaza números que no son enteros ni negativos', () => {
    for (const malo of [-1, 1.5, NaN, Infinity]) expect(() => estudiantePorNumero(malo)).toThrow(RangeError);
  });
});

describe('cabina dibujada', () => {
  it('cabe CAPACIDAD_CABINA personas de pie sin solaparse (3 columnas por 4 filas)', () => {
    // Medidas de pie con los brazos como en idle (public/modelos, ver `npm run modelos`): ancho 1,26 y fondo 0,80 como máximo.
    const anchoPersona = 1.26;
    const fondoPersona = 0.8;
    const columnas = 3;
    const filas = Math.ceil(CAPACIDAD_CABINA / columnas);
    expect(columnas * anchoPersona).toBeLessThanOrEqual(CABINA_DIBUJADA.ancho);
    expect(filas * fondoPersona).toBeLessThanOrEqual(CABINA_DIBUJADA.fondo);
    expect(CABINA_DIBUJADA.alto).toBeGreaterThan(ALTURA_PERSONA * 1.2);
  });
});

describe('modelos preparados en public/modelos', () => {
  it('están los 9 GLB y la textura compartida', () => {
    expect(ARCHIVOS_MODELOS).toHaveLength(9);
    for (const a of [...ARCHIVOS_MODELOS, TEXTURA_MODELOS]) expect(statSync(resolve(CARPETA, a)).size).toBeGreaterThan(0);
  });

  it('van comprimidos con Meshopt y usan la textura compartida, sin copia propia', () => {
    for (const a of ARCHIVOS_MODELOS) {
      const j = jsonDe(a);
      expect(j.extensionsRequired).toContain('EXT_meshopt_compression');
      expect(j.images).toEqual([{ uri: TEXTURA_MODELOS, name: 'colormap' }]);
    }
  });

  it('las personas traen los clips que usa la escena y las piezas no traen animaciones', () => {
    const clips = (a: string) => (jsonDe(a).animations ?? []).map((x: { name: string }) => x.name);
    for (const e of ESTUDIANTES) expect(clips(`${e}.glb`).sort()).toEqual([...CLIPS_ESTUDIANTE].sort());
    expect(clips(`${MODELO_ASEO}.glb`).sort()).toEqual([...CLIPS_ASEO].sort());
    expect(clips(`${MODELO_SILLA}.glb`)).toEqual([]);
    expect(clips(`${MODELO_MULETA}.glb`)).toEqual([]);
  });

  it('no pasan de 5000 triángulos cada uno', () => {
    for (const a of ARCHIVOS_MODELOS) {
      const j = jsonDe(a);
      let triangulos = 0;
      for (const m of j.meshes) for (const p of m.primitives) triangulos += j.accessors[p.indices].count / 3;
      expect(triangulos).toBeLessThan(5000);
    }
  });
});
