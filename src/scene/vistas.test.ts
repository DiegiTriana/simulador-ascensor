import { describe, expect, it } from 'vitest';
import {
  BLOQUE,
  DECORACION,
  PARED_DERECHA_Z,
  PARED_IZQUIERDA_Z,
  PASILLO,
  TORRE,
  Y_FONDO,
  Y_TECHO,
  yPiso,
} from './medidas.ts';
import {
  ALTURA_DE_CORTE,
  alturaDeCorte,
  limitesExterior,
  poseCompleto,
  poseDe,
  poseDePrueba,
  poseExterior,
  poseFila,
  posePiso,
  posePlanta,
  type Pose,
  type Vec3,
} from './vistas.ts';

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

  it('los letreros, la puerta de las escaleras y la banca se ven completos, sea cual sea la forma del lienzo', () => {
    const { escaleras: e, numero: n, banca: b } = DECORACION;
    // Cada pieza como una caja: x desde–hasta, y desde–hasta y la pared en que está.
    const piezas: { nombre: string; x: [number, number]; y: [number, number]; z: number }[] = [
      { nombre: 'puerta de las escaleras', x: [e.x - e.ancho / 2, e.x + e.ancho / 2], y: [0, e.alto], z: PARED_IZQUIERDA_Z },
      {
        nombre: 'letrero de las escaleras',
        x: [e.x - e.ancho / 2, e.x + e.ancho / 2],
        y: [e.letreroY - e.letreroAlto / 2, e.letreroY + e.letreroAlto / 2],
        z: PARED_IZQUIERDA_Z,
      },
      {
        nombre: 'número del piso',
        x: [n.x - n.lado / 2, n.x + n.lado / 2],
        y: [n.y - n.lado / 2, n.y + n.lado / 2],
        z: PARED_DERECHA_Z,
      },
      { nombre: 'banca', x: [b.x - b.ancho / 2, b.x + b.ancho / 2], y: [0, b.alto], z: PARED_DERECHA_Z },
    ];
    for (const aspecto of [0.8, 1, 1.2, 1.39, 1.6, 2, 2.4]) {
      for (const piso of [1, 9]) {
        const pose = posePiso(piso, aspecto);
        for (const pieza of piezas) {
          for (const x of pieza.x) {
            for (const y of pieza.y) {
              const p = proyectar(pose, aspecto, [x, yPiso(piso) + y, pieza.z]);
              expect(p.delante, `${pieza.nombre} detrás de la cámara (aspecto ${aspecto})`).toBe(true);
              expect(Math.abs(p.x), `${pieza.nombre} cortada a los lados (aspecto ${aspecto})`).toBeLessThan(1);
              expect(Math.abs(p.y), `${pieza.nombre} cortada arriba o abajo (aspecto ${aspecto})`).toBeLessThan(1);
            }
          }
        }
      }
    }
  });

  it('el campo de visión solo se abre cuando el lienzo es angosto, y nunca pasa de 75°', () => {
    expect(posePiso(1, 1.6).fov).toBe(40);
    expect(posePiso(1, 1).fov).toBeGreaterThan(40);
    for (const aspecto of [0.8, 1, 1.4, 2.4]) expect(posePiso(1, aspecto).fov).toBeLessThanOrEqual(75);
  });

  it('poseDe elige la pose de la vista pedida', () => {
    expect(poseDe('exterior', 4, 1.4)).toEqual(poseExterior(1.4));
    expect(poseDe('exterior', 4, 1.4, 'todo')).toEqual(poseExterior(1.4));
    expect(poseDe('exterior', 4, 1.4, 'fila')).toEqual(poseFila(1.4));
    expect(poseDe('piso', 4, 1.4)).toEqual(posePiso(4, 1.4));
    expect(poseDe('piso', 4, 1.4, 'fila')).toEqual(posePiso(4, 1.4));
  });
});

describe('encuadre «Ver la fila»', () => {
  it('muestra completo el pie de la torre: P1 con su vestíbulo, el pozo y la cabina, en cualquier lienzo', () => {
    for (const aspecto of [0.8, 1, 1.39, 1.6, 2.4]) {
      const pose = poseFila(aspecto);
      for (const x of [TORRE.x0, TORRE.x1]) {
        for (const y of [yPiso(1), yPiso(1) + 2.6]) {
          for (const z of [TORRE.z0, TORRE.z1]) {
            const p = proyectar(pose, aspecto, [x, y, z]);
            expect(p.delante).toBe(true);
            expect(Math.abs(p.x), `aspecto ${aspecto}`).toBeLessThanOrEqual(1);
            expect(Math.abs(p.y), `aspecto ${aspecto}`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('queda mucho más cerca que la vista de todo el edificio y dentro de los límites de la cámara', () => {
    for (const aspecto of [1, 1.39, 2]) {
      const fila = poseFila(aspecto);
      const todo = poseExterior(aspecto);
      const dist = (p: Pose) => Math.hypot(...p.posicion.map((v, i) => v - p.objetivo[i]));
      expect(dist(fila)).toBeLessThan(dist(todo) / 3);
      const l = limitesExterior(aspecto);
      expect(dist(fila)).toBeGreaterThan(l.distanciaMin);
      expect(dist(fila)).toBeLessThanOrEqual(l.distanciaMax);
      const acimut = Math.atan2(fila.posicion[0] - fila.objetivo[0], fila.posicion[2] - fila.objetivo[2]);
      expect(acimut).toBeGreaterThan(l.azimutMin);
      expect(acimut).toBeLessThan(l.azimutMax);
      for (let i = 0; i < 3; i++) {
        expect(fila.objetivo[i]).toBeGreaterThanOrEqual(l.objetivoMin[i]);
        expect(fila.objetivo[i]).toBeLessThanOrEqual(l.objetivoMax[i]);
      }
    }
  });
});

describe('cámara de prueba (solo desarrollo)', () => {
  it('lee la posición, el punto que mira y el campo de visión', () => {
    expect(poseDePrueba('?camara=1,2,3,4,5,6')).toEqual({ posicion: [1, 2, 3], objetivo: [4, 5, 6], fov: 40 });
    expect(poseDePrueba('?vista=piso&camara=1.5, 2, 3, 4, 5, 6, 55')?.fov).toBe(55);
  });

  it('descarta lo que falta o está mal escrito', () => {
    expect(poseDePrueba('')).toBeNull();
    expect(poseDePrueba('?camara=1,2,3')).toBeNull();
    expect(poseDePrueba('?camara=a,b,c,d,e,f')).toBeNull();
    expect(poseDePrueba('?camara=1,2,3,4,5,6,500')).toBeNull();
    expect(poseDePrueba('?camara=1,2,3,4,5,6,40,9')).toBeNull();
  });
});

describe('edificio completo', () => {
  it('se ve de frente y sin giro, con todo el edificio de P10 al sótano en cualquier forma de lienzo', () => {
    for (const aspecto of ASPECTOS) {
      const pose = poseCompleto(aspecto);
      expect(pose.posicion[0]).toBeCloseTo(pose.objetivo[0], 6);
      expect(pose.posicion[2]).toBeGreaterThan(pose.objetivo[2]);
      for (const x of [BLOQUE.x0, TORRE.x1]) {
        for (const y of [Y_FONDO, Y_TECHO]) {
          for (const z of [BLOQUE.z0, BLOQUE.z1]) {
            const p = proyectar(pose, aspecto, [x, y, z]);
            expect(p.delante).toBe(true);
            expect(Math.abs(p.x), `aspecto ${aspecto}`).toBeLessThanOrEqual(1);
            expect(Math.abs(p.y), `aspecto ${aspecto}`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('poseDe la elige', () => {
    expect(poseDe('completo', 4, 1.4)).toEqual(poseCompleto(1.4));
  });
});

describe('planta', () => {
  it('la cámara está justo arriba del centro del pasillo y el pozo, mirando hacia abajo, con el frente hacia abajo de la pantalla', () => {
    for (const piso of [1, 5, 9]) {
      const pose = posePlanta(piso, 1.4);
      expect(pose.posicion[0]).toBeCloseTo(pose.objetivo[0], 6);
      expect(pose.posicion[2]).toBeCloseTo(pose.objetivo[2], 2);
      expect(pose.posicion[1]).toBeGreaterThan(yPiso(piso) + 10);
      expect(pose.objetivo[1]).toBe(yPiso(piso));
      expect(pose.arriba).toEqual([0, 0, -1]);
    }
  });

  it('cabe todo lo que tiene el piso (pasillo, vestíbulo y pozo) en cualquier forma de lienzo', () => {
    for (const aspecto of ASPECTOS) {
      const pose = posePlanta(3, aspecto);
      const altura = pose.posicion[1] - pose.objetivo[1];
      const mitadAlto = altura * Math.tan((pose.fov * Math.PI) / 360);
      const mitadAncho = mitadAlto * aspecto;
      // Girada (lienzo vertical), el alto de la pantalla cubre x y el ancho cubre z.
      const [sobreX, sobreZ] = aspecto < 1 ? [mitadAlto, mitadAncho] : [mitadAncho, mitadAlto];
      for (const x of [PASILLO.x0, TORRE.x1]) {
        expect(Math.abs(x - pose.objetivo[0]), `aspecto ${aspecto}`).toBeLessThanOrEqual(sobreX);
      }
      for (const z of [TORRE.z0, TORRE.z1]) {
        expect(Math.abs(z - pose.objetivo[2]), `aspecto ${aspecto}`).toBeLessThanOrEqual(sobreZ);
      }
    }
  });

  it('el corte queda sobre las cabezas (1,2) y bajo el techo de la cabina (1,9), a la altura del piso elegido', () => {
    expect(ALTURA_DE_CORTE).toBeGreaterThan(1.2);
    expect(ALTURA_DE_CORTE).toBeLessThan(1.9);
    expect(alturaDeCorte(1)).toBeCloseTo(ALTURA_DE_CORTE, 9);
    expect(alturaDeCorte(4)).toBeCloseTo(yPiso(4) + ALTURA_DE_CORTE, 9);
  });

  it('en un lienzo vertical se gira 90° y ocupa el alto; en uno horizontal no cambia', () => {
    for (const aspecto of [0.4, 0.7, 0.99]) expect(posePlanta(2, aspecto).arriba).toEqual([1, 0, 0]);
    for (const aspecto of [1, 1.39, 2.4]) expect(posePlanta(2, aspecto).arriba).toEqual([0, 0, -1]);
    // Girada llena casi todo el alto: el largo de la planta ocupa más de la mitad de la pantalla.
    for (const aspecto of [0.5, 0.7]) {
      const pose = posePlanta(2, aspecto);
      const mitadAlto = (pose.posicion[1] - pose.objetivo[1]) * Math.tan((pose.fov * Math.PI) / 360);
      expect((TORRE.x1 - PASILLO.x0) / 2 / mitadAlto).toBeGreaterThan(0.7);
    }
    // Y se ve más grande que sin girar: la misma planta en un lienzo vertical.
    const girada = posePlanta(2, 0.6).posicion[1];
    expect(girada).toBeLessThan(2.6 + (TORRE.x1 - PASILLO.x0 + 2.4) / 2 / (Math.tan((28 * Math.PI) / 360) * 0.6));
  });

  it('poseDe la elige', () => {
    expect(poseDe('planta', 6, 1.4)).toEqual(posePlanta(6, 1.4));
  });
});
