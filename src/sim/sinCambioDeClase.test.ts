// Franja sin ningún cambio de clase: no hay picos. Todas las llegadas son de valle (parejas en toda
// la franja) y las personas que bajan también se reparten parejo, porque no hay clase que las suelte.
import { describe, expect, it } from 'vitest';
import { generarEscenario, tasaEsperadaPicos } from './llegadas.ts';
import { simularEntradas } from './simulacion.ts';
import { validar } from './validacion.ts';
import type { Entradas } from './tipos.ts';

// 06:05 a 06:45: el cambio de clase de las 06:50 queda fuera.
const SIN_CAMBIO: Entradas = { horaInicioMin: 6 * 60 + 5, duracionMin: 40, llegadasP1: 90, bajan: 40, sillas: 0, muletas: 0, usosAseo: 0 };

describe('franja sin cambio de clase', () => {
  const e = generarEscenario(SIN_CAMBIO, 7);
  const T = e.duracionS;
  const sube = e.personas.filter((p) => p.origen === 1);
  const baja = e.personas.filter((p) => p.origen !== 1);

  it('no tiene ventanas de pico ni personas marcadas como de pico', () => {
    expect(e.ventanasPico).toEqual([]);
    expect(e.personas.some((p) => p.enPico)).toBe(false);
  });

  it('nadie esperaba al comenzar y llegan todas las pedidas', () => {
    expect(sube).toHaveLength(90);
    expect(sube.some((p) => p.inicial)).toBe(false);
    expect(baja).toHaveLength(40);
  });

  it('las llegadas se reparten parejo en toda la franja (cuartos con 15 a 30 de 90)', () => {
    const cuartos = [0, 0, 0, 0];
    for (const p of sube) cuartos[Math.min(3, Math.floor((p.llegada / T) * 4))]++;
    for (const c of cuartos) expect(c).toBeGreaterThanOrEqual(10);
    for (const c of cuartos) expect(c).toBeLessThanOrEqual(35);
  });

  it('quienes bajan también se reparten parejo en toda la franja, no en un tramo', () => {
    const grande = generarEscenario({ ...SIN_CAMBIO, bajan: 400 }, 3).personas.filter((p) => p.origen !== 1);
    const cuartos = [0, 0, 0, 0];
    for (const p of grande) cuartos[Math.min(3, Math.floor((p.llegada / T) * 4))]++;
    for (const c of cuartos) expect(c).toBeGreaterThan(60);
    expect(Math.min(...grande.map((p) => p.llegada))).toBeLessThan(T * 0.1);
    expect(Math.max(...grande.map((p) => p.llegada))).toBeGreaterThan(T * 0.9);
  });

  it('todas las llegadas caen dentro de la franja', () => {
    for (const p of e.personas) {
      expect(p.llegada).toBeGreaterThanOrEqual(0);
      expect(p.llegada).toBeLessThan(T);
    }
  });

  it('no hay tasa de pico y por eso no hay aviso de saturación, aunque lleguen muchas', () => {
    expect(tasaEsperadaPicos(SIN_CAMBIO)).toBeNull();
    const r = validar({ horaInicio: '06:05', duracion: '40', llegadasP1: '3000', bajan: '0', sillas: '0', muletas: '0', usosAseo: '0' });
    expect(r.ok && r.avisos).toEqual([]);
  });

  it('la simulación corre y atiende a todos', () => {
    const r = simularEntradas(SIN_CAMBIO, 1);
    expect(r.llegadas).toBe(90);
    expect(r.pico.llegadas).toBe(0);
    expect(r.pico.abandonoPct).toBeNull();
    expect(r.bajan.atendidos).toBe(40);
  });

  it('con el único cambio de clase justo al final de la franja tampoco suelta a nadie en un tramo', () => {
    // 06:20 a 06:50: el cambio de las 06:50 es el último segundo; las bajadas se reparten parejo.
    const fin = generarEscenario({ ...SIN_CAMBIO, horaInicioMin: 6 * 60 + 20, duracionMin: 30, bajan: 300 }, 5);
    const bajan = fin.personas.filter((p) => p.origen !== 1);
    expect(Math.min(...bajan.map((p) => p.llegada))).toBeLessThan(fin.duracionS * 0.1);
  });
});
