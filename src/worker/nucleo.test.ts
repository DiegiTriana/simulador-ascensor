import { describe, expect, it } from 'vitest';
import { CASO_MIERCOLES } from '../data/casos.ts';
import { correrVarias, comparar } from '../sim/corridas.ts';
import { crearNucleo } from './nucleo.ts';
import type { Respuesta } from './protocolo.ts';

function preparar() {
  const salida: Respuesta[] = [];
  const nucleo = crearNucleo((r) => salida.push(r));
  const hasta = async (f: (r: Respuesta) => boolean) => {
    for (let i = 0; i < 2000 && !salida.some(f); i++) await new Promise((r) => setTimeout(r, 1));
    expect(salida.some(f)).toBe(true);
  };
  return { salida, nucleo, hasta };
}

describe('núcleo del worker', () => {
  it('envía progreso 0..n y el resultado igual al de correr las corridas en el hilo principal', async () => {
    const { salida, nucleo, hasta } = preparar();
    nucleo.recibir({ tipo: 'simular', generacion: 1, entradas: CASO_MIERCOLES, semilla: 1, corridas: 4 });
    await hasta((r) => r.tipo === 'resultado');
    const prog = salida.flatMap((r) => (r.tipo === 'progreso' ? [r.hechas] : []));
    expect(prog).toEqual([0, 1, 2, 3, 4]);
    const res = salida.find((r) => r.tipo === 'resultado');
    expect(res && res.tipo === 'resultado' && res.comparacion).toEqual(comparar(CASO_MIERCOLES, correrVarias(CASO_MIERCOLES, 4, 1)));
  });

  it('cancelar corta la corrida y avisa; no llega resultado', async () => {
    const { salida, nucleo, hasta } = preparar();
    nucleo.recibir({ tipo: 'simular', generacion: 5, entradas: CASO_MIERCOLES, semilla: 1, corridas: 50 });
    await hasta((r) => r.tipo === 'progreso' && r.hechas >= 1);
    nucleo.recibir({ tipo: 'cancelar', generacion: 5 });
    await hasta((r) => r.tipo === 'cancelado');
    await new Promise((r) => setTimeout(r, 20));
    expect(salida.some((r) => r.tipo === 'resultado')).toBe(false);
    expect(salida.filter((r) => r.tipo === 'progreso').length).toBeLessThan(51);
    expect(salida.every((r) => r.generacion === 5)).toBe(true);
  });

  it('cancelar otra generación no afecta a la que corre', async () => {
    const { nucleo, hasta } = preparar();
    nucleo.recibir({ tipo: 'simular', generacion: 2, entradas: CASO_MIERCOLES, semilla: 1, corridas: 3 });
    nucleo.recibir({ tipo: 'cancelar', generacion: 1 });
    await hasta((r) => r.tipo === 'resultado');
  });

  it('una petición nueva cancela la anterior y da su propio resultado', async () => {
    const { salida, nucleo, hasta } = preparar();
    nucleo.recibir({ tipo: 'simular', generacion: 1, entradas: CASO_MIERCOLES, semilla: 1, corridas: 50 });
    await hasta((r) => r.tipo === 'progreso' && r.generacion === 1);
    nucleo.recibir({ tipo: 'simular', generacion: 2, entradas: CASO_MIERCOLES, semilla: 1, corridas: 2 });
    await hasta((r) => r.tipo === 'resultado' && r.generacion === 2);
    expect(salida.some((r) => r.tipo === 'cancelado' && r.generacion === 1)).toBe(true);
    expect(salida.some((r) => r.tipo === 'resultado' && r.generacion === 1)).toBe(false);
  });

  it('las entradas inválidas y los datos absurdos salen como mensaje de error, sin lanzar', async () => {
    const { salida, nucleo, hasta } = preparar();
    nucleo.recibir({ tipo: 'simular', generacion: 1, entradas: { ...CASO_MIERCOLES, llegadasP1: -3 }, semilla: 1, corridas: 3 });
    await hasta((r) => r.tipo === 'error');
    nucleo.recibir({ tipo: 'simular', generacion: 2, entradas: CASO_MIERCOLES, semilla: 1, corridas: 0 });
    await hasta((r) => r.tipo === 'error' && r.generacion === 2);
    const err = salida.find((r) => r.tipo === 'error');
    expect(err && err.tipo === 'error' && err.mensaje.length).toBeGreaterThan(0);
  });
});
