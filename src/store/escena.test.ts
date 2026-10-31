import { beforeEach, describe, expect, it } from 'vitest';
import { PISO_INICIAL, limitarPiso, useEscena } from './escena.ts';

beforeEach(() => {
  useEscena.setState({ vista: 'exterior', piso: PISO_INICIAL, restablecer: 0 });
});

describe('vista de la escena', () => {
  it('empieza en la vista exterior, en P1', () => {
    const s = useEscena.getState();
    expect(s.vista).toBe('exterior');
    expect(s.piso).toBe(1);
  });

  it('limita el piso a P1–P9 y lo redondea', () => {
    expect(limitarPiso(0)).toBe(1);
    expect(limitarPiso(10)).toBe(9);
    expect(limitarPiso(4.4)).toBe(4);
    useEscena.getState().fijarPiso(12);
    expect(useEscena.getState().piso).toBe(9);
  });

  it('cambiarPiso sube y baja sin salirse de P1–P9', () => {
    const { cambiarPiso } = useEscena.getState();
    cambiarPiso(-1);
    expect(useEscena.getState().piso).toBe(1);
    cambiarPiso(3);
    expect(useEscena.getState().piso).toBe(4);
    cambiarPiso(20);
    expect(useEscena.getState().piso).toBe(9);
  });

  it('cambiar de vista no toca el piso elegido', () => {
    useEscena.getState().fijarPiso(6);
    useEscena.getState().fijarVista('piso');
    useEscena.getState().fijarVista('exterior');
    expect(useEscena.getState().piso).toBe(6);
  });

  it('restablecer vuelve a la vista exterior y avisa a la cámara', () => {
    useEscena.getState().fijarVista('piso');
    useEscena.getState().restablecerCamara();
    const s = useEscena.getState();
    expect(s.vista).toBe('exterior');
    expect(s.restablecer).toBe(1);
  });
});
