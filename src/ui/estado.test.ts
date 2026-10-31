import { describe, expect, it } from 'vitest';
import { textoCorrida, textoEstado } from './estado.ts';

describe('texto de estado', () => {
  it('dice qué corrida va, y que está lista o cancelada', () => {
    expect(textoEstado('simulando', { hechas: 3, total: 10 }, null, false)).toBe('Corrida 4 de 10');
    expect(textoEstado('listo', null, null, false)).toBe('Simulación lista');
    expect(textoEstado('cancelado', null, null, false)).toBe('Simulación cancelada');
  });

  it('«Revisa los campos marcados» tiene prioridad salvo mientras corre la simulación', () => {
    expect(textoEstado('inactivo', null, null, true)).toBe('Revisa los campos marcados.');
    expect(textoEstado('listo', null, null, true)).toBe('Revisa los campos marcados.');
    expect(textoEstado('simulando', { hechas: 1, total: 10 }, null, true)).toBe('Corrida 2 de 10');
  });

  it('un error del worker dice qué pasó y qué hacer', () => {
    expect(textoEstado('error', null, 'falló', false)).toContain('falló');
    expect(textoEstado('error', null, 'falló', false)).toContain('Pulsa Simular');
  });
});

describe('corrida en curso', () => {
  it('es la siguiente a las hechas y nunca pasa del total', () => {
    expect(textoCorrida({ hechas: 0, total: 10 })).toBe('Corrida 1 de 10');
    expect(textoCorrida({ hechas: 9, total: 10 })).toBe('Corrida 10 de 10');
    expect(textoCorrida({ hechas: 10, total: 10 })).toBe('Corrida 10 de 10');
    expect(textoCorrida(null)).toBe('Corrida 1 de 10');
  });
});
