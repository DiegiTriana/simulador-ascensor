import { describe, expect, it } from 'vitest';
import { CASO_MIERCOLES } from '../data/casos.ts';
import { correrVarias } from './corridas.ts';
import { crearRng } from './rng.ts';
import { generarEscenario } from './llegadas.ts';
import { otraSemilla, SEMILLA_DEFECTO } from './semilla.ts';

describe('semilla', () => {
  it('el generador repite la misma secuencia con la misma semilla y cambia con otra', () => {
    const a = crearRng(42);
    const b = crearRng(42);
    const c = crearRng(43);
    const sa = Array.from({ length: 5 }, a);
    const sb = Array.from({ length: 5 }, b);
    const sc = Array.from({ length: 5 }, c);
    expect(sa).toEqual(sb);
    expect(sa).not.toEqual(sc);
    for (const x of sa) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('las mismas entradas con la semilla por defecto dan siempre el mismo resultado', () => {
    const r1 = correrVarias(CASO_MIERCOLES, 3, SEMILLA_DEFECTO);
    const r2 = correrVarias(CASO_MIERCOLES, 3, SEMILLA_DEFECTO);
    expect(r2).toEqual(r1);
  });

  it('otra semilla da otra muestra', () => {
    const nueva = otraSemilla(SEMILLA_DEFECTO, () => 0.5);
    expect(nueva).not.toBe(SEMILLA_DEFECTO);
    const a = generarEscenario(CASO_MIERCOLES, SEMILLA_DEFECTO).personas.map((p) => p.llegada);
    const b = generarEscenario(CASO_MIERCOLES, nueva).personas.map((p) => p.llegada);
    expect(b).not.toEqual(a);
  });

  it('otraSemilla nunca devuelve la actual, aunque el azar la repita', () => {
    const actual = 1 + Math.floor(0.25 * (0x7fffffff - 1));
    expect(otraSemilla(actual, () => 0.25)).not.toBe(actual);
  });

  it('otraSemilla es un entero positivo dentro de 31 bits', () => {
    for (const u of [0, 0.3, 0.999999]) {
      const s = otraSemilla(7, () => u);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThanOrEqual(0x7fffffff);
    }
  });
});
