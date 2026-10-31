import { describe, expect, it } from 'vitest';
import { FORMA_PICO_ANTES, FORMA_PICO_DESPUES, TRAMOS_PICO_ANTES, TRAMOS_PICO_DESPUES, normalizar } from './formaPicos.ts';

describe('formas de los picos', () => {
  for (const [nombre, forma, tramos] of [
    ['después del cambio de clase (pico 1)', FORMA_PICO_DESPUES, TRAMOS_PICO_DESPUES],
    ['antes del cambio de clase (pico 2)', FORMA_PICO_ANTES, TRAMOS_PICO_ANTES],
  ] as const) {
    describe(nombre, () => {
      it('las proporciones de llegadas suman 100 %', () => {
        expect(forma.reduce((s, t) => s + t.proporcion, 0)).toBeCloseTo(1, 12);
      });

      it('los tramos cubren de 0 a 1 sin huecos ni traslapes', () => {
        expect(forma[0].desde).toBe(0);
        expect(forma.at(-1)!.hasta).toBeCloseTo(1, 12);
        for (let i = 1; i < forma.length; i++) expect(forma[i].desde).toBeCloseTo(forma[i - 1].hasta, 12);
      });

      it('respetan las duraciones y las llegadas de los datos', () => {
        const segundos = tramos.reduce((s, t) => s + t.segundos, 0);
        const llegadas = tramos.reduce((s, t) => s + t.llegadas, 0);
        forma.forEach((t, i) => {
          expect((t.hasta - t.desde) * segundos).toBeCloseTo(tramos[i].segundos, 9);
          expect(t.proporcion * llegadas).toBeCloseTo(tramos[i].llegadas, 9);
        });
      });
    });
  }

  it('los datos del miércoles: 46 personas en cada pico', () => {
    expect(TRAMOS_PICO_DESPUES.reduce((s, t) => s + t.llegadas, 0)).toBe(46);
    expect(TRAMOS_PICO_ANTES.reduce((s, t) => s + t.llegadas, 0)).toBe(46);
    expect(TRAMOS_PICO_ANTES.reduce((s, t) => s + t.segundos, 0)).toBe(750);
  });

  it('normalizar funciona con cualquier tabla', () => {
    const f = normalizar([{ llegadas: 1, segundos: 10 }, { llegadas: 3, segundos: 30 }]);
    expect(f[0]).toEqual({ desde: 0, hasta: 0.25, proporcion: 0.25 });
    expect(f[1]).toEqual({ desde: 0.25, hasta: 1, proporcion: 0.75 });
  });
});
