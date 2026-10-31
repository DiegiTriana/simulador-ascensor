import { describe, expect, it } from 'vitest';
import { ALTURA_PERSONA, CABINA_DIBUJADA } from '../data/modelos.ts';
import {
  ALTURA_PISO,
  CABINA,
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

describe('medidas de la escena', () => {
  it('P1 está en y = 0, el sótano un piso más abajo y P10 es el último', () => {
    expect(yPiso(1)).toBe(0);
    expect(yPiso(PISO_SOTANO)).toBeCloseTo(-ALTURA_PISO);
    expect(Y_FONDO).toBe(yPiso(PISO_SOTANO));
    expect(Y_TECHO).toBeCloseTo(yPiso(PISO_SIN_ACCESO) + ALTURA_PISO);
  });

  it('las etiquetas de los pisos son S, P1…P10', () => {
    expect(etiquetaPiso(0)).toBe('S');
    expect(etiquetaPiso(1)).toBe('P1');
    expect(etiquetaPiso(10)).toBe('P10');
  });

  it('la cabina solo está «en» un piso cuando no va entre dos', () => {
    expect(pisoDeCabina(3)).toBe(3);
    expect(pisoDeCabina(3.005)).toBe(3);
    expect(pisoDeCabina(3.4)).toBeNull();
    expect(pisoDeCabina(0)).toBe(0);
  });

  it('la cabina y la puerta caben en el pozo y en el piso', () => {
    // La cabina entera (con sus paredes) cabe entre la pared de puertas y el vidrio de la derecha.
    expect(CABINA.xCentro - CABINA.fondo / 2 - CABINA.pared).toBeGreaterThan(TORRE.xPuertas);
    expect(CABINA.xCentro + CABINA.fondo / 2 + CABINA.pared).toBeLessThan(TORRE.x1);
    expect(CABINA.ancho + 2 * CABINA.pared).toBeLessThan(TORRE.ancho);
    // La puerta cabe en la cabina y bajo la losa de arriba, con lugar para el indicador.
    expect(PUERTA.ancho).toBeLessThan(CABINA.ancho);
    expect(PUERTA.alto).toBeLessThanOrEqual(CABINA.alto);
    expect(PUERTA.alto + 0.6).toBeLessThan(ALTURA_PISO);
  });

  it('usa la cabina dibujada de la fase 4 y personas más bajas que la puerta', () => {
    expect(CABINA.ancho).toBe(CABINA_DIBUJADA.ancho);
    expect(CABINA.fondo).toBe(CABINA_DIBUJADA.fondo);
    expect(ALTURA_PERSONA).toBeLessThan(PUERTA.alto);
  });
});
