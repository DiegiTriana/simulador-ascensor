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
  it('una persona de P1 a P4: abre 3,3 s, sube a los 3,3 s y baja a los 28,9 s', () => {
    // 6,3 s con puertas abiertas contados desde que empiezan a abrir (3,3 abrir + 3,0 más) + cerrar 4,3
    // + 3 pisos × 5 s + abrir 3,3 = 3,3 + 3,0 + 4,3 + 15 + 3,3 = 28,9
    const r = simular(escenario([persona(0, 0, 4)]), 1);
    const [v] = r.vueltas;
    expect(v.t).toBeCloseTo(3.3, 5);
    expect(r.Wq).toBeCloseTo(3.3, 5);
    expect(r.W).toBeCloseTo(28.9, 5);
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

  it('abandono en picos dentro de ±3 puntos del 20,6 % real', () => {
    expect(Math.abs(c.sim.abandonoPicoPct!.media - 20.6)).toBeLessThan(3);
  });

  it('la vuelta saturada dura lo que las reales: media entre 130 y 180 s', () => {
    const duraciones = corridas.flatMap((r) =>
      r.vueltas.filter((v) => !v.aseo && v.quedanAfuera > 0 && v.duracion !== null).map((v) => v.duracion as number),
    );
    const media = duraciones.reduce((s, x) => s + x, 0) / duraciones.length;
    expect(media).toBeGreaterThan(130);
    expect(media).toBeLessThan(180);
  });
});

describe('forma de las llegadas dentro de los picos', () => {
  const cuentaEntre = (e: Escenario, a: number, b: number) =>
    e.personas.filter((p) => p.origen === 1 && !p.inicial && p.llegada >= a && p.llegada < b).length;

  it('el miércoles: 92 personas en picos, 46 en cada uno, con las llegadas por tramo de los datos', () => {
    const e = generarEscenario(CASO_MIERCOLES, 4);
    const escala = 750 / 760; // los tramos del pico 1 suman 760 s y el pico dura 750 s
    // Pico 1: 15, 13, 11 y 7 personas
    const cortes1 = [0, 120, 245, 490, 760].map((x) => x * escala);
    expect([0, 1, 2, 3].map((k) => cuentaEntre(e, cortes1[k], cortes1[k + 1]))).toEqual([15, 13, 11, 7]);
    // Pico 2: 12, 13, 14 y 7 personas (los tramos suman justo 750 s)
    const cortes2 = [0, 230, 365, 560, 750].map((x) => 2250 + x);
    expect([0, 1, 2, 3].map((k) => cuentaEntre(e, cortes2[k], cortes2[k + 1]))).toEqual([12, 13, 14, 7]);
  });

  it('escala al total de cada pico según las entradas', () => {
    // 215 llegadas: 27 ya esperan (15/119 escalado), quedan 188 y el 88 % (165) va a los picos
    const e = generarEscenario({ ...CASO_MIERCOLES, llegadasP1: 215 }, 4);
    const p1 = cuentaEntre(e, 0, 750);
    const p2 = cuentaEntre(e, 2250, 3000);
    expect(p1 + p2).toBe(165);
    expect(Math.abs(p1 - p2)).toBeLessThanOrEqual(1);
  });

  it('si la franja corta un pico, solo queda la parte de la forma que cae dentro', () => {
    // 12:50 a 13:30: el pico 1 ya empezó hace 10 min y solo quedan 2,5 min de su cola
    const e = generarEscenario({ ...CASO_MIERCOLES, horaInicioMin: 12 * 60 + 50, duracionMin: 40, llegadasP1: 60 }, 4);
    const enPico = e.personas.filter((p) => p.origen === 1 && p.enPico).length;
    expect(enPico).toBe(Math.round(60 * 0.88));
  });
});
