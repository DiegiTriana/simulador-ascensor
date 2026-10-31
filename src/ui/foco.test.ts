import { describe, expect, it } from 'vitest';
import { destinoAlTerminar } from './foco.ts';

describe('a dónde lleva la página al terminar de simular', () => {
  it('en escritorio baja a los resultados, haya escena o no', () => {
    expect(destinoAlTerminar({ escritorio: true, hayEscena: true })).toBe('resultados');
    expect(destinoAlTerminar({ escritorio: true, hayEscena: false })).toBe('resultados');
  });

  it('en celular va a la escena, donde empieza la animación', () => {
    expect(destinoAlTerminar({ escritorio: false, hayEscena: true })).toBe('escena');
  });

  it('en celular sin escena (sin WebGL) baja directo a los resultados', () => {
    expect(destinoAlTerminar({ escritorio: false, hayEscena: false })).toBe('resultados');
  });
});
