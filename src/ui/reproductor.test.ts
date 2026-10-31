import { describe, expect, it } from 'vitest';
import { fraccionDeFranja, minutosYSegundos, pasoLaFranja } from './reproductor.ts';

describe('barra de tiempo de la corrida', () => {
  it('el fin de la franja cae en la proporción de la corrida (el miércoles: 50:00 de 51:30)', () => {
    expect(fraccionDeFranja(3000, 3090)).toBeCloseTo(0.9709, 4);
    expect(fraccionDeFranja(600, 1200)).toBe(0.5);
  });

  it('no hay marca si la corrida termina cuando la franja o antes, ni con franja de cero', () => {
    expect(fraccionDeFranja(3000, 3000)).toBeNull();
    expect(fraccionDeFranja(3000, 2900)).toBeNull();
    expect(fraccionDeFranja(0, 3000)).toBeNull();
    expect(fraccionDeFranja(Number.NaN, 3000)).toBeNull();
  });

  it('la frase sale cuando el reloj llega al fin de la franja y no antes', () => {
    expect(pasoLaFranja(2999.9, 3000, 3090)).toBe(false);
    expect(pasoLaFranja(3000, 3000, 3090)).toBe(true);
    expect(pasoLaFranja(3090, 3000, 3090)).toBe(true);
    expect(pasoLaFranja(10, 3000, 3000)).toBe(false);
  });

  it('da minutos y segundos como se leen', () => {
    expect(minutosYSegundos(0)).toBe('0:00');
    expect(minutosYSegundos(65.9)).toBe('1:05');
    expect(minutosYSegundos(3000)).toBe('50:00');
    expect(minutosYSegundos(-3)).toBe('0:00');
  });
});
