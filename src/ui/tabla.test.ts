import { describe, expect, it } from 'vitest';
import { CASO_MIERCOLES } from '../data/casos.ts';
import { comparar, correrVarias } from '../sim/corridas.ts';
import { construirTabla, indicadoresDe } from './tabla.ts';

const entradasOtras = { ...CASO_MIERCOLES, llegadasP1: 60 };
const cMiercoles = comparar(CASO_MIERCOLES, correrVarias(CASO_MIERCOLES, 3, 1));

describe('tabla comparativa', () => {
  const t = construirTabla(CASO_MIERCOLES, cMiercoles);

  it('empieza con los dos porcentajes de escaleras y sigue con λ, μ, ρ, L, Lq, W, Wq y λef', () => {
    expect(t.filas.map((f) => f.id)).toEqual([
      'escaleras-picos', 'escaleras-total', 'lambda', 'mu', 'rho', 'L', 'Lq', 'W', 'Wq', 'lambdaEf',
    ]);
  });

  it('en el caso del miércoles agrega la fila Real con 20,6 % y 18,5 %', () => {
    expect(t.real).toEqual({ picos: '20,6 %', total: '18,5 %' });
  });

  it('con otras entradas no hay fila Real', () => {
    const otra = comparar(entradasOtras, correrVarias(entradasOtras, 3, 1));
    expect(construirTabla(entradasOtras, otra).real).toBeNull();
  });

  it('usa coma decimal y ± solo en la simulación', () => {
    const f = t.filas[0];
    expect(f.sim?.valor).toMatch(/^\d+,\d$/);
    expect(f.sim?.pm).toMatch(/^± \d+,\d$/);
    expect(f.picos?.pm).toBeUndefined();
    expect(f.franja).toBeNull();
    expect(t.filas[1].picos).toBeNull();
  });

  it('la frase dice «se quedan cortas» cuando las fórmulas dan menos que la simulación', () => {
    expect(t.frase).toMatch(/^Las fórmulas dan .*% \(toda la franja\) y .*% \(picos\); la simulación, .*% en los picos y .*% en total\./);
    expect(t.frase).toContain('Las fórmulas se quedan cortas.');
  });

  it('el indicador principal compara los picos y trae el real del miércoles', () => {
    const i = indicadoresDe(CASO_MIERCOLES, cMiercoles);
    expect(i.base).toBe('picos');
    expect(i.real).toBe(20.6);
    expect(i.simulacion).toBeGreaterThan(i.formulas ?? 0);
    expect(i.vueltaSeg).toBeGreaterThan(100);
  });
});

describe('franja sin cambio de clase', () => {
  const e = { ...CASO_MIERCOLES, horaInicioMin: 12 * 60 + 41, duracionMin: 20, llegadasP1: 30, bajan: 0 };
  const c = comparar(e, correrVarias(e, 3, 1));

  it('compara el total y no inventa picos', () => {
    const i = indicadoresDe(e, c);
    expect(i.base).toBe('total');
    expect(i.real).toBeNull();
    const t = construirTabla(e, c);
    expect(t.filas[0].sim).toBeNull();
    expect(t.filas[0].picos).toBeNull();
    expect(t.frase ?? '').not.toContain('(picos)');
    expect(t.frase ?? '').not.toContain('se quedan cortas');
  });
});
