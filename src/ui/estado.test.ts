import { describe, expect, it } from 'vitest';
import { plantillaDe, textoEstado } from './estado.ts';

describe('texto de estado', () => {
  it('dice cuántas corridas van, y que está lista o cancelada', () => {
    expect(textoEstado('simulando', { hechas: 3, total: 10 }, null, false)).toBe('Simulando, 3 de 10');
    expect(textoEstado('listo', null, null, false)).toBe('Simulación lista');
    expect(textoEstado('cancelado', null, null, false)).toBe('Simulación cancelada');
  });

  it('«Revisa los campos marcados» tiene prioridad salvo mientras corre la simulación', () => {
    expect(textoEstado('inactivo', null, null, true)).toBe('Revisa los campos marcados.');
    expect(textoEstado('listo', null, null, true)).toBe('Revisa los campos marcados.');
    expect(textoEstado('simulando', { hechas: 1, total: 10 }, null, true)).toBe('Simulando, 1 de 10');
  });

  it('un error del worker dice qué pasó y qué hacer', () => {
    expect(textoEstado('error', null, 'falló', false)).toContain('falló');
    expect(textoEstado('error', null, 'falló', false)).toContain('Pulsa Simular');
  });
});

describe('plantilla de segmentos', () => {
  it('rellena con 8 hasta el mínimo de cifras', () => {
    expect(plantillaDe('64', 3)).toBe('888');
    expect(plantillaDe('20.7', 3)).toBe('88.8');
    expect(plantillaDe('165', 3)).toBe('888');
  });
});
