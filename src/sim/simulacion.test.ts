import { describe, expect, it } from 'vitest';
import { CASO_MIERCOLES } from '../data/casos.ts';
import { comparar, correrVarias } from './corridas.ts';
import { generarEscenario } from './llegadas.ts';
import { CONFIG_DEFECTO, simular, simularEntradas } from './simulacion.ts';
import type { Escenario, Persona } from './tipos.ts';

function persona(id: number, llegada: number, destino: number, extra: Partial<Persona> = {}): Persona {
  return {
    id, tipo: 'normal', cupos: 1, origen: 1, destino, llegada, inicial: false, enPico: false,
    abordo: null, bajo: null, seFue: false, ...extra,
  };
}

function escenario(personas: Persona[], extra: Partial<Escenario> = {}): Escenario {
  return { duracionS: 600, personas, solicitudesAseo: [], ventanasPico: [], ...extra };
}

const sinEscaleras = { ...CONFIG_DEFECTO, probEscaleras: 0 };
const todasEscaleras = { ...CONFIG_DEFECTO, probEscaleras: 1 };

describe('simulación con casos pequeños hechos a mano', () => {
  it('una persona de P1 a P4: abre 3,3 s, sube a los 3,3 s y baja a los 32,2 s', () => {
    // abrir 3,3 + puertas abiertas 6,3 + cerrar 4,3 + 3 pisos × 5 s + abrir 3,3 = 32,2
    const r = simular(escenario([persona(0, 0, 4)]), 1);
    const [v] = r.vueltas;
    expect(v.t).toBeCloseTo(3.3, 5);
    expect(r.Wq).toBeCloseTo(3.3, 5);
    expect(r.W).toBeCloseTo(32.2, 5);
    expect(r.abandonos).toBe(0);
  });

  it('sin llamadas se queda en su última parada y no se mueve', () => {
    const r = simular(escenario([persona(0, 0, 4)], { duracionS: 600 }), 1);
    expect(r.vueltas).toHaveLength(1); // nunca vuelve a abrir en P1
  });

  it('12 personas y todas se van si no caben: sube 10 y se van 2', () => {
    const ps = Array.from({ length: 12 }, (_, i) => persona(i, 0, 5));
    const r = simular(escenario(ps), 1, todasEscaleras);
    expect(r.vueltas[0].suben).toBe(10);
    expect(r.vueltas[0].quedanAfuera).toBe(2);
    expect(r.vueltas[0].rechazos).toBe(2);
    expect(r.abandonos).toBe(2);
    expect(r.abordaron).toBe(10);
  });

  it('si no se van, esperan la siguiente vuelta y suben todos', () => {
    const ps = Array.from({ length: 12 }, (_, i) => persona(i, 0, 5));
    const r = simular(escenario(ps), 1, sinEscaleras);
    expect(r.abandonos).toBe(0);
    expect(r.abordaron).toBe(12);
    expect(r.vueltas[1].suben).toBe(2);
    expect(r.vueltas[0].duracion).toBeGreaterThan(30);
  });

  it('la silla de ruedas ocupa 3 cupos y sube primero', () => {
    const ps = [
      ...Array.from({ length: 9 }, (_, i) => persona(i, 0, 5)),
      persona(9, 0, 5, { tipo: 'silla', cupos: 3 }),
    ];
    const r = simular(escenario(ps), 1, todasEscaleras);
    // silla (3) + 7 normales = 10; quedan 2 normales, que se van
    expect(r.vueltas[0].suben).toBe(8);
    expect(r.vueltas[0].quedanAfuera).toBe(2);
    expect(r.abandonos).toBe(2);
  });

  it('las muletas ocupan 2 cupos y nunca se van por las escaleras', () => {
    const ps = [
      ...Array.from({ length: 10 }, (_, i) => persona(i, 0, 5)),
      persona(10, 0, 5, { tipo: 'muletas', cupos: 2 }),
    ];
    const r = simular(escenario(ps), 1, todasEscaleras);
    expect(r.vueltas[0].suben).toBe(9); // muletas + 8 normales
    expect(r.abandonos).toBe(2);
    expect(ps.length).toBe(11);
    // la persona con muletas llegó a bajar
    expect(r.abordaron).toBe(9);
  });

  it('quien baja desde P6 a P1 espera, baja y llega a P1', () => {
    const r = simular(escenario([persona(0, 0, 1, { origen: 6 })]), 1);
    expect(r.bajan.atendidos).toBe(1);
    expect(r.bajan.esperaPromedio).toBeGreaterThan(0);
  });

  it('el aseo bloquea el ascensor 150 s desde que abre en P1', () => {
    const r = simular(escenario([persona(0, 60, 5)], { solicitudesAseo: [0] }), 1);
    expect(r.aseoAtendidos).toBe(1);
    const aseo = r.vueltas.find((v) => v.aseo);
    expect(aseo?.t).toBeCloseTo(3.3, 5);
    // la persona que llegó a los 60 s sube recién cuando termina el uso exclusivo
    expect(r.Wq).toBeGreaterThanOrEqual(3.3 + 150 - 60);
  });

  it('el aseo con la cabina ocupada espera a que quede vacía', () => {
    const r = simular(escenario([persona(0, 0, 5)], { solicitudesAseo: [0] }), 1);
    // primero la persona (sube a los 3,3 s), después el aseo
    expect(r.Wq).toBeCloseTo(3.3, 5);
    expect(r.aseoAtendidos).toBe(1);
  });
});

describe('reparto de llegadas', () => {
  it('el miércoles: 119 llegadas con 15 ya esperando, 19 que bajan y 1 uso del aseo', () => {
    const e = generarEscenario(CASO_MIERCOLES, 7);
    const subidas = e.personas.filter((p) => p.origen === 1);
    expect(subidas).toHaveLength(119);
    expect(subidas.filter((p) => p.inicial)).toHaveLength(15);
    expect(e.personas.filter((p) => p.origen > 1)).toHaveLength(19);
    expect(e.solicitudesAseo).toHaveLength(1);
    expect(e.ventanasPico).toEqual([[0, 750], [2250, 3000]]);
  });

  it('88 % de las que no esperaban caen en los picos', () => {
    const e = generarEscenario(CASO_MIERCOLES, 7);
    const nuevas = e.personas.filter((p) => p.origen === 1 && !p.inicial);
    expect(nuevas).toHaveLength(104);
    expect(nuevas.filter((p) => p.enPico)).toHaveLength(92);
  });

  it('todos los tiempos están dentro de la franja y ordenados', () => {
    const e = generarEscenario(CASO_MIERCOLES, 3);
    for (let i = 0; i < e.personas.length; i++) {
      expect(e.personas[i].llegada).toBeGreaterThanOrEqual(0);
      expect(e.personas[i].llegada).toBeLessThan(e.duracionS);
      if (i > 0) expect(e.personas[i].llegada).toBeGreaterThanOrEqual(e.personas[i - 1].llegada);
    }
  });

  it('las sillas y muletas se cuentan dentro de las llegadas', () => {
    const e = generarEscenario({ ...CASO_MIERCOLES, sillas: 2, muletas: 1 }, 5);
    expect(e.personas.filter((p) => p.origen === 1)).toHaveLength(119);
    expect(e.personas.filter((p) => p.tipo === 'silla')).toHaveLength(2);
    expect(e.personas.filter((p) => p.tipo === 'muletas')).toHaveLength(1);
  });

  it('rechaza entradas inválidas', () => {
    expect(() => generarEscenario({ ...CASO_MIERCOLES, llegadasP1: -1 }, 1)).toThrow(RangeError);
    expect(() => generarEscenario({ ...CASO_MIERCOLES, sillas: 200 }, 1)).toThrow(RangeError);
    expect(() => generarEscenario({ ...CASO_MIERCOLES, duracionMin: 0 }, 1)).toThrow(RangeError);
  });
});

describe('propiedades generales', () => {
  it('misma semilla, mismos resultados; otra semilla, otros', () => {
    const a = simularEntradas(CASO_MIERCOLES, 11);
    const b = simularEntradas(CASO_MIERCOLES, 11);
    const c = simularEntradas(CASO_MIERCOLES, 12);
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });

  it('nada aparece ni desaparece: llegadas = subieron + se fueron, y todos los que subieron bajan', () => {
    for (const semilla of [1, 2, 3, 4, 5]) {
      const r = simularEntradas(CASO_MIERCOLES, semilla);
      expect(r.abordaron + r.abandonos).toBe(r.llegadas);
      expect(r.bajan.atendidos).toBe(r.bajan.total);
      for (const v of r.vueltas) {
        expect(v.suben).toBeLessThanOrEqual(10);
        expect(v.rechazos).toBeLessThanOrEqual(v.quedanAfuera);
      }
    }
  });

  it('la ocupación nunca pasa de 10: ninguna vuelta sube más de 10', () => {
    const r = simularEntradas({ ...CASO_MIERCOLES, llegadasP1: 400 }, 9);
    expect(Math.max(...r.vueltas.map((v) => v.suben))).toBeLessThanOrEqual(10);
  });
});

describe('validación con el caso del miércoles', () => {
  const corridas = correrVarias(CASO_MIERCOLES, 10, 1);
  const c = comparar(CASO_MIERCOLES, corridas);

  it('λ en picos ≈ 3,7 por minuto, como en los datos', () => {
    expect(c.sim.lambdaPicoPorMin!.media).toBeGreaterThan(3.5);
    expect(c.sim.lambdaPicoPorMin!.media).toBeLessThan(3.9);
  });

  it('el promedio de 10 corridas se parece a la hora pico real: ni 0 ni todos se van', () => {
    const m = c.sim.abandonoPicoPct!.media;
    expect(m).toBeGreaterThan(8);
    expect(m).toBeLessThan(30);
  });

  // PENDIENTE (fase 1): el objetivo es ≈ 20 % (real 20,6 %). El modelo literal da ≈ 16 % (ver docs/plan.md).
  // Cuando se decida cómo cerrar la brecha, este caso debe pasar y quitarse el `.fails`.
  it.fails('abandono en picos dentro de ±3 puntos del 20,6 % real', () => {
    expect(Math.abs(c.sim.abandonoPicoPct!.media - 20.6)).toBeLessThan(3);
  });
});
