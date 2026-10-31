import { describe, expect, it } from 'vitest';
import { BLOQUES, CAMBIOS_DE_CLASE, cambiosEnFranja, formatoHora } from './horario.ts';

describe('horario de clases', () => {
  it('tiene 20 bloques seguidos, sin huecos ni traslapes', () => {
    expect(BLOQUES).toHaveLength(20);
    for (let i = 1; i < BLOQUES.length; i++) expect(BLOQUES[i].inicio).toBe(BLOQUES[i - 1].fin);
  });

  it('duraciones: 50 min hasta el bloque 14, 40 min el 15 y 45 min del 16 al 20', () => {
    const dur = BLOQUES.map((b) => b.fin - b.inicio);
    expect(dur.slice(0, 14).every((d) => d === 50)).toBe(true);
    expect(dur[14]).toBe(40);
    expect(dur.slice(15).every((d) => d === 45)).toBe(true);
  });

  it('los límites en 24 horas son los de la imagen', () => {
    const horas = CAMBIOS_DE_CLASE.map(formatoHora);
    expect(horas[0]).toBe('06:00');
    expect(horas).toContain('12:40');
    expect(horas).toContain('13:30'); // «12:40 - 01:30» en la imagen
    expect(horas).toContain('17:40');
    expect(horas).toContain('18:20'); // «05:40 - 06:20»
    expect(horas).toContain('19:05');
    expect(horas.at(-1)).toBe('22:05');
  });

  it('el miércoles: la franja 12:40–13:30 tiene cambios en sus dos extremos', () => {
    expect(cambiosEnFranja(12 * 60 + 40, 50).map(formatoHora)).toEqual(['12:40', '13:30']);
  });

  it('una franja a mitad de bloque no incluye cambios al inicio', () => {
    expect(cambiosEnFranja(12 * 60 + 50, 40).map(formatoHora)).toEqual(['13:30']);
  });
});
