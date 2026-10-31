import { describe, expect, it } from 'vitest';
import { BLOQUE, PASILLO, TORRE, Y_FONDO, Y_TECHO, yPiso } from './medidas.ts';
import { limitesExterior, poseDe, poseExterior, posePiso, type Pose, type Vec3 } from './vistas.ts';

const ASPECTOS = [0.7, 1, 1.39, 1.6, 2.4];

const producto = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Proyecta un punto con la cámara de la pose: x e y normalizados (entre −1 y 1 si cae dentro de la pantalla). */
function proyectar(pose: Pose, aspecto: number, punto: Vec3): { x: number; y: number; delante: boolean } {
  const [px, py, pz] = pose.posicion;
  const f = [pose.objetivo[0] - px, pose.objetivo[1] - py, pose.objetivo[2] - pz];
  const lf = Math.hypot(...f);
  const fw = f.map((v) => v / lf);
  // Derecha = adelante × arriba(0,1,0), normalizada; arriba de la cámara = derecha × adelante.
  const der = [-fw[2], 0, fw[0]];
  const ld = Math.hypot(...der);
  const r = der.map((v) => v / ld);
  const u = [r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]];
  const d = [punto[0] - px, punto[1] - py, punto[2] - pz];
  const z = producto(d, fw);
  const t = Math.tan((pose.fov * Math.PI) / 360);
  return { x: producto(d, r) / (z * t * aspecto), y: producto(d, u) / (z * t), delante: z > 0 };
}

describe('vista exterior', () => {
  it('encuadra todo el edificio con su torre, de P10 al sótano, en cualquier forma de lienzo', () => {
    for (const aspecto of ASPECTOS) {
      const pose = poseExterior(aspecto);
      const esquinas: Vec3[] = [];
      for (const x of [BLOQUE.x0, TORRE.x1]) {
        for (const y of [Y_FONDO, Y_TECHO]) {
          for (const z of [BLOQUE.z0, BLOQUE.z1]) esquinas.push([x, y, z]);
        }
      }
      for (const e of esquinas) {
        const p = proyectar(pose, aspecto, e);
        expect(p.delante).toBe(true);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(p.y)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('mira desde el frente y la derecha, un poco por encima', () => {
    const { posicion, objetivo } = poseExterior(1.3);
    expect(posicion[2]).toBeGreaterThan(objetivo[2]);
    expect(posicion[0]).toBeGreaterThan(objetivo[0]);
    expect(posicion[1]).toBeGreaterThan(objetivo[1]);
  });

  it('los límites dejan la cámara inicial dentro del rango permitido', () => {
    for (const aspecto of ASPECTOS) {
      const { posicion, objetivo } = poseExterior(aspecto);
      const l = limitesExterior(aspecto);
      const d = Math.hypot(posicion[0] - objetivo[0], posicion[1] - objetivo[1], posicion[2] - objetivo[2]);
      expect(d).toBeGreaterThan(l.distanciaMin);
      expect(d).toBeLessThanOrEqual(l.distanciaMax);
      const acimut = Math.atan2(posicion[0] - objetivo[0], posicion[2] - objetivo[2]);
      expect(acimut).toBeGreaterThan(l.azimutMin);
      expect(acimut).toBeLessThan(l.azimutMax);
      const polar = Math.acos((posicion[1] - objetivo[1]) / d);
      expect(polar).toBeGreaterThan(l.polarMin);
      expect(polar).toBeLessThan(l.polarMax);
    }
  });
});

describe('vista desde un piso', () => {
  it('la cámara está dentro del pasillo de ese piso y mira la puerta del ascensor (+x)', () => {
    for (const aspecto of ASPECTOS) {
      for (const piso of [1, 5, 9]) {
        const { posicion, objetivo } = posePiso(piso, aspecto);
        expect(posicion[0]).toBeGreaterThan(PASILLO.x0);
        expect(posicion[0]).toBeLessThan(PASILLO.x1);
        expect(posicion[2]).toBeGreaterThan(TORRE.z0);
        expect(posicion[2]).toBeLessThan(TORRE.z1);
        expect(posicion[1]).toBeGreaterThan(yPiso(piso) + 1.5);
        expect(posicion[1]).toBeLessThan(yPiso(piso) + 2.3);
        expect(objetivo[0]).toBe(TORRE.xPuertas);
        expect(objetivo[1]).toBeGreaterThan(yPiso(piso));
        expect(objetivo[1]).toBeLessThan(yPiso(piso) + 1.9);
      }
    }
  });

  it('se ve todo el ancho de la torre frente a la cámara (el vestíbulo y la puerta)', () => {
    for (const aspecto of [1, 1.39, 1.6]) {
      const pose = posePiso(3, aspecto);
      for (const z of [TORRE.z0, TORRE.z1]) {
        const p = proyectar(pose, aspecto, [TORRE.xPuertas, yPiso(3) + 1, z]);
        expect(Math.abs(p.x)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('cada piso queda a su altura: la cámara sube con el piso', () => {
    const a = posePiso(1, 1.4).posicion[1];
    const b = posePiso(9, 1.4).posicion[1];
    expect(b - a).toBeCloseTo(yPiso(9) - yPiso(1));
  });

  it('poseDe elige la pose de la vista pedida', () => {
    expect(poseDe('exterior', 4, 1.4)).toEqual(poseExterior(1.4));
    expect(poseDe('piso', 4, 1.4)).toEqual(posePiso(4, 1.4));
  });
});
