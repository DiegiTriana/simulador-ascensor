import { describe, expect, it } from 'vitest';
import { CASO_MIERCOLES } from '../data/casos.ts';
import { corridaAnimada } from '../sim/corridas.ts';
import { CONFIG_DEFECTO, simular } from '../sim/simulacion.ts';
import { crearTraza, type Entradas, type Escenario, type Persona, type Traza } from '../sim/tipos.ts';
import {
  ASEO_ENTRADA_S,
  EMBARQUE_S,
  ESCALERAS_S,
  LLEGADA_S,
  MAX_POR_PISO,
  PASO_FILA_S,
  SALIDA_S,
  cabinaEn,
  construirIndice,
  estadoEn,
  formatoReloj,
  indicadoresEn,
} from './corrida.ts';
import { lugarEnFila } from './disposicion.ts';
import { CABINA, PISO_MAXIMO, TORRE, yPiso } from './medidas.ts';
import type { EstadoVista, PersonaVista } from './vista.ts';

function persona(id: number, llegada: number, destino: number, extra: Partial<Persona> = {}): Persona {
  return {
    id, tipo: 'normal', cupos: 1, origen: 1, destino, llegada, inicial: false, enPico: false,
    abordo: null, bajo: null, seFue: false, ...extra,
  };
}
function escenario(personas: Persona[], extra: Partial<Escenario> = {}): Escenario {
  return { duracionS: 600, personas, solicitudesAseo: [], ventanasPico: [], ...extra };
}
function trazaDe(esc: Escenario, probEscaleras = CONFIG_DEFECTO.probEscaleras): Traza {
  const traza = crearTraza();
  simular(esc, 1, { ...CONFIG_DEFECTO, probEscaleras }, traza);
  return traza;
}
const indiceDe = (esc: Escenario, probEscaleras?: number) => construirIndice(trazaDe(esc, probEscaleras));

const porId = (v: EstadoVista, id: number): PersonaVista | undefined => v.personas.find((p) => p.id === id);
const distancia = (a: PersonaVista, b: PersonaVista) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const MIERCOLES = corridaAnimada(CASO_MIERCOLES, 1);
const ixMiercoles = construirIndice(MIERCOLES.traza);
const CARGADO: Entradas = {
  horaInicioMin: 12 * 60, duracionMin: 40, llegadasP1: 700, bajan: 120, sillas: 4, muletas: 6, usosAseo: 4,
};
const CARGA = corridaAnimada(CARGADO, 2);
const ixCarga = construirIndice(CARGA.traza);

/** Segundos de muestra repartidos por toda la corrida. */
const muestras = (fin: number, n: number) => Array.from({ length: n }, (_, i) => (fin * (i + 0.37)) / n);

describe('indicadores', () => {
  it('coinciden, segundo a segundo, con contar a mano sobre la traza (fila de P1, bordo, escaleras)', () => {
    const { traza } = MIERCOLES;
    const sube = new Map<number, number>();
    const baja = new Map<number, number>();
    const escaleras = new Map<number, number>();
    for (const e of traza.eventos) {
      if (e.tipo === 'sube' && e.persona >= 0) sube.set(e.persona, e.t);
      if (e.tipo === 'baja' && e.persona >= 0) baja.set(e.persona, e.t);
      if (e.tipo === 'escaleras') escaleras.set(e.persona, e.t);
    }
    for (const t of muestras(traza.finS, 400)) {
      const i = indicadoresEn(ixMiercoles, t);
      let fila = 0;
      let abordo = 0;
      let seFueron = 0;
      for (const p of traza.personas) {
        if (p.id < 0) continue;
        const salida = Math.min(sube.get(p.id) ?? Infinity, escaleras.get(p.id) ?? Infinity);
        if (p.origen === 1 && p.llegada <= t && t < salida) fila++;
        const s = sube.get(p.id);
        if (s !== undefined && s <= t && t < (baja.get(p.id) ?? Infinity)) abordo++;
        if ((escaleras.get(p.id) ?? Infinity) <= t) seFueron++;
      }
      expect(i.fila, `fila de P1 en t=${t}`).toBe(fila);
      expect(i.escaleras, `escaleras en t=${t}`).toBe(seFueron);
      // El aseo también ocupa la cabina cuando viaja.
      expect(i.ocupantes - abordo).toBeGreaterThanOrEqual(0);
      expect(i.ocupantes - abordo).toBeLessThanOrEqual(1);
      expect(i.cupos).toBeLessThanOrEqual(10);
    }
  });

  it('al final de la corrida no queda nadie en la fila ni a bordo y las escaleras suman los abandonos', () => {
    const i = indicadoresEn(ixMiercoles, MIERCOLES.traza.finS);
    expect(i.fila).toBe(0);
    expect(i.ocupantes).toBe(0);
    expect(i.escaleras).toBe(MIERCOLES.resultado.abandonos);
  });

  it('al principio todo está en cero y la cabina en P1', () => {
    const i = indicadoresEn(ixMiercoles, 0);
    expect(i).toMatchObject({ piso: 1, sentido: 0, ocupantes: 0, cupos: 0, escaleras: 0 });
  });
});

describe('estadoEn no tiene memoria: es función del segundo', () => {
  it('da lo mismo se pida en el orden que se pida, y lo mismo con un índice recién armado', () => {
    const tiempos = muestras(MIERCOLES.traza.finS, 60);
    const enOrden = tiempos.map((t) => estadoEn(ixMiercoles, t));
    const alReves = [...tiempos].reverse().map((t) => estadoEn(ixMiercoles, t)).reverse();
    expect(alReves).toEqual(enOrden);
    const otroIndice = construirIndice(MIERCOLES.traza);
    expect(tiempos.map((t) => estadoEn(otroIndice, t))).toEqual(enOrden);
  });

  it('pausar congela todo: pedir el mismo segundo muchas veces da exactamente lo mismo', () => {
    for (const t of [40, 400, 1200]) {
      const primero = estadoEn(ixMiercoles, t);
      for (let i = 0; i < 50; i++) expect(estadoEn(ixMiercoles, t)).toEqual(primero);
    }
  });

  it('un salto del reloj coloca todo como si se hubiera llegado de corrido', () => {
    // Avanzar por pasos de 0,1 s hasta t no cambia lo que se dibuja en t.
    const destino = 837.4;
    let ultimo = estadoEn(ixMiercoles, 800);
    for (let t = 800; t <= destino; t += 0.1) ultimo = estadoEn(ixMiercoles, t);
    expect(estadoEn(ixMiercoles, destino)).toEqual(estadoEn(ixMiercoles, destino));
    expect(ultimo.cabina.piso).toBeCloseTo(estadoEn(ixMiercoles, 800 + Math.floor((destino - 800) / 0.1) * 0.1).cabina.piso, 9);
  });
});

describe('lo que se dibuja', () => {
  it('nunca más de MAX_POR_PISO personas en la fila de un piso, aunque haya cientos esperando', () => {
    let masLarga = 0;
    for (const t of muestras(CARGA.traza.finS, 300)) {
      const v = estadoEn(ixCarga, t);
      const porPiso = new Map<number, number>();
      for (const p of v.personas) {
        // En la fila: no está en la cabina (x del pozo) ni se va caminando.
        if (p.x < TORRE.xPuertas - 0.3 && !p.caminando) porPiso.set(Math.round(p.y / 2.6), (porPiso.get(Math.round(p.y / 2.6)) ?? 0) + 1);
      }
      for (const n of porPiso.values()) masLarga = Math.max(masLarga, n);
    }
    expect(masLarga).toBeLessThanOrEqual(MAX_POR_PISO);
    // Y la prueba tiene sentido: hubo filas mucho más largas que lo que se dibuja.
    expect(Math.max(...muestras(CARGA.traza.finS, 300).map((t) => indicadoresEn(ixCarga, t).fila))).toBeGreaterThan(MAX_POR_PISO);
  });

  it('el total de personas dibujadas tiene tope y nadie se repite', () => {
    for (const t of muestras(CARGA.traza.finS, 300)) {
      const v = estadoEn(ixCarga, t);
      // Filas (12 por piso) + cabina + quienes bajan, suben o se van a la vez + aseo.
      expect(v.personas.length).toBeLessThanOrEqual((PISO_MAXIMO + 1) * MAX_POR_PISO + 12 + MAX_POR_PISO + 25);
      expect(new Set(v.personas.map((p) => p.id)).size).toBe(v.personas.length);
    }
  });

  it('todas las posiciones son números y están cerca del edificio', () => {
    for (const t of muestras(CARGA.traza.finS, 200)) {
      for (const p of estadoEn(ixCarga, t).personas) {
        for (const n of [p.x, p.y, p.z, p.giro, p.ciclos]) expect(Number.isFinite(n)).toBe(true);
        expect(p.x).toBeGreaterThanOrEqual(-4.5);
        expect(p.x).toBeLessThanOrEqual(CABINA.xCentro + 2);
        expect(p.y).toBeGreaterThanOrEqual(yPiso(0) - 0.1);
        expect(p.y).toBeLessThanOrEqual(yPiso(PISO_MAXIMO) + 0.5);
      }
    }
  });
});

describe('cabina y puertas con un caso a mano (tres personas de P1 a P5)', () => {
  const ix = indiceDe(escenario([persona(0, 0, 5), persona(1, 0, 5), persona(2, 0, 5)]));

  it('las puertas abren de 0 a 1 en 3,3 s, quedan abiertas y cierran de 1 a 0 en 4,3 s', () => {
    expect(cabinaEn(ix, 0).puertas).toBe(0);
    expect(cabinaEn(ix, 1.65).puertas).toBeCloseTo(0.5, 6);
    expect(cabinaEn(ix, 3.3).puertas).toBe(1);
    expect(cabinaEn(ix, 6).puertas).toBe(1);
    expect(cabinaEn(ix, 9.3 + 2.15).puertas).toBeCloseTo(0.5, 6);
    expect(cabinaEn(ix, 13.6).puertas).toBe(0);
    // Las puertas no se abren mientras la cabina va de un piso a otro.
    expect(cabinaEn(ix, 16).puertas).toBe(0);
  });

  it('la cabina sube de P1 a P5 a 5 s por piso, con el sentido y sin saltos', () => {
    expect(cabinaEn(ix, 13.6)).toMatchObject({ piso: 1, sentido: 1 });
    expect(cabinaEn(ix, 13.6 + 2.5).piso).toBeCloseTo(1.5, 6);
    expect(cabinaEn(ix, 13.6 + 5)).toMatchObject({ piso: 2 });
    expect(cabinaEn(ix, 13.6 + 20)).toMatchObject({ piso: 5, sentido: 0 });
    let anterior = cabinaEn(ix, 0).piso;
    for (let t = 0; t < 60; t += 0.05) {
      const p = cabinaEn(ix, t).piso;
      expect(Math.abs(p - anterior)).toBeLessThan(0.02);
      anterior = p;
    }
  });

  it('quienes van a bordo suben con la cabina y bajan en P5 caminando', () => {
    const subiendo = estadoEn(ix, 13.6 + 10);
    for (const id of [0, 1, 2]) {
      const p = porId(subiendo, id)!;
      expect(p.y).toBeCloseTo(yPiso(subiendo.cabina.piso) + 0.02, 6);
      expect(p.caminando).toBe(false);
      expect(p.x).toBeGreaterThan(CABINA.xCentro - CABINA.fondo / 2);
      expect(p.x).toBeLessThan(CABINA.xCentro + CABINA.fondo / 2);
    }
    // En P5 baja de a una, cada 2 s, y se aleja del ascensor hasta desaparecer.
    const llegada = 13.6 + 20 + 3.3;
    const baja = estadoEn(ix, llegada + 1);
    const una = baja.personas.find((p) => p.caminando)!;
    expect(una).toBeDefined();
    expect(una.y).toBeGreaterThan(yPiso(4));
    expect(estadoEn(ix, llegada + 2 + SALIDA_S + 4 + 1).personas.filter((p) => p.y > yPiso(4)).length).toBe(0);
  });
});

describe('las personas no saltan: cada trayecto empieza donde terminó el anterior', () => {
  const salto = 0.06; // metros que puede cambiar una posición en 2 milisegundos de reloj
  const cerca = (a: PersonaVista | undefined, b: PersonaVista | undefined, mensaje: string) => {
    expect(a, `${mensaje}: falta antes`).toBeDefined();
    expect(b, `${mensaje}: falta después`).toBeDefined();
    expect(distancia(a!, b!), mensaje).toBeLessThan(salto);
  };

  it('al subir (de la fila a la puerta y a su lugar), al bajar y al irse por las escaleras', () => {
    const esc = escenario(Array.from({ length: 13 }, (_, i) => persona(i, i * 0.5, 4 + (i % 3))));
    const traza = trazaDe(esc, 1);
    const ix = construirIndice(traza);
    let revisados = 0;
    for (const e of traza.eventos) {
      if (e.tipo === 'sube' && e.persona >= 0) {
        const ya = e.t - 0.001;
        const luego = e.t + 0.001;
        cerca(porId(estadoEn(ix, ya), e.persona), porId(estadoEn(ix, luego), e.persona), `subir persona ${e.persona}`);
        const entra = e.t + EMBARQUE_S;
        cerca(porId(estadoEn(ix, entra - 0.001), e.persona), porId(estadoEn(ix, entra + 0.001), e.persona), `llegar a su lugar ${e.persona}`);
        revisados++;
      }
      if (e.tipo === 'baja' && e.persona >= 0) {
        cerca(porId(estadoEn(ix, e.t - 0.001), e.persona), porId(estadoEn(ix, e.t + 0.001), e.persona), `bajar persona ${e.persona}`);
        revisados++;
      }
      if (e.tipo === 'escaleras') {
        cerca(porId(estadoEn(ix, e.t - 0.001), e.persona), porId(estadoEn(ix, e.t + 0.001), e.persona), `ir a las escaleras ${e.persona}`);
        revisados++;
      }
    }
    expect(revisados).toBeGreaterThan(20);
  });

  it('en una corrida con filas largas, y al llegar a la fila', () => {
    let revisados = 0;
    for (const e of CARGA.traza.eventos.slice(0, 1500)) {
      if (e.tipo === 'sube' && e.persona >= 0) {
        // Quien sube con prioridad desde atrás de la fila que se dibuja (silla, muletas) aparece al empezar a subir.
        const antes = porId(estadoEn(ixCarga, e.t - 0.001), e.persona);
        if (antes) {
          cerca(antes, porId(estadoEn(ixCarga, e.t + 0.001), e.persona), `subir ${e.persona}`);
          revisados++;
        }
      }
      if (e.tipo === 'escaleras') {
        const antes = porId(estadoEn(ixCarga, e.t - 0.001), e.persona);
        // Quien iba más atrás que la fila que se dibuja no se ve irse; quien sí se veía, se va sin saltos.
        if (antes) {
          cerca(antes, porId(estadoEn(ixCarga, e.t + 0.001), e.persona), `escaleras ${e.persona}`);
          revisados++;
        }
      }
    }
    expect(revisados).toBeGreaterThan(100);
    // Quien llega aparece en el borde del pasillo y entra a la fila caminando.
    const primera = CARGA.traza.personas.find((p) => p.origen === 1 && p.llegada > 5)!;
    const justo = porId(estadoEn(ixCarga, primera.llegada + 0.001), primera.id)!;
    expect(justo.x).toBeLessThan(-3.5);
    expect(justo.caminando).toBe(true);
    const fila = porId(estadoEn(ixCarga, primera.llegada + LLEGADA_S + 0.2), primera.id);
    expect(fila === undefined || fila.x > -3.5).toBe(true);
  });
});

describe('la fila avanza', () => {
  it('quien está detrás da un paso adelante, en 1 s, cuando el de adelante sube', () => {
    // 12 personas en P1 desde el segundo 0; la primera sube a los 3,3 s y la sexta pasa del lugar 5 al 4.
    const personas = Array.from({ length: 12 }, (_, i) => persona(i, 0, 5));
    const ix = indiceDe(escenario(personas), 0);
    const lugar = (rango: number) => lugarEnFila(rango, 5);
    const antes = porId(estadoEn(ix, 3.2), 5)!;
    expect(antes.caminando).toBe(false);
    expect([antes.x, antes.z]).toEqual([lugar(5).x, lugar(5).z]);

    const mitad = porId(estadoEn(ix, 3.3 + PASO_FILA_S / 2), 5)!;
    expect(mitad.caminando).toBe(true);
    // A mitad del paso está a medio camino entre el lugar 5 y el 4.
    const hacia = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
    const total = hacia(lugar(5), lugar(4));
    expect(hacia(mitad, lugar(5))).toBeGreaterThan(0.05 * total);
    expect(hacia(mitad, lugar(4))).toBeGreaterThan(0.05 * total);
    expect(hacia(mitad, lugar(5)) + hacia(mitad, lugar(4))).toBeCloseTo(total, 3);

    const despues = porId(estadoEn(ix, 3.3 + PASO_FILA_S + 0.05), 5)!;
    expect(despues.caminando).toBe(false);
    expect([despues.x, despues.z]).toEqual([lugar(4).x, lugar(4).z]);
  });

  it('quien sigue en la fila después de que cierran las puertas se queda en su lugar', () => {
    const personas = Array.from({ length: 12 }, (_, i) => persona(i, 0, 5));
    const traza = trazaDe(escenario(personas), 0); // nadie se va por las escaleras
    const ix = construirIndice(traza);
    const cierra = traza.eventos.find((e) => e.tipo === 'cierra')!;
    const quedan = [10, 11];
    for (const id of quedan) {
      const a = porId(estadoEn(ix, cierra.t + 0.5), id)!;
      const b = porId(estadoEn(ix, cierra.t + 3), id)!;
      expect(a.caminando).toBe(false);
      expect(distancia(a, b)).toBeLessThan(1e-9);
    }
  });
});

describe('el aseo', () => {
  const traza = trazaDe(escenario([], { solicitudesAseo: [5] }));
  const ix = construirIndice(traza);
  const sube = traza.eventos.find((e) => e.tipo === 'sube')!;
  const baja = traza.eventos.find((e) => e.tipo === 'baja')!;
  const fin = traza.eventos.find((e) => e.tipo === 'aseoTermina')!;
  const aseo = (t: number) => estadoEn(ix, t).personas.find((p) => p.tipo === 'aseo');

  it('aparece en el vestíbulo de P1 antes de subir, va a bordo, baja en el sótano, espera y se va', () => {
    expect(aseo(sube.t - 4)).toBeUndefined();
    expect(aseo(sube.t - 1)?.y).toBeCloseTo(yPiso(1), 6);
    expect(aseo(sube.t + EMBARQUE_S + 0.5)?.x).toBeGreaterThan(CABINA.xCentro - CABINA.fondo / 2);
    expect(aseo(baja.t + ASEO_ENTRADA_S + 1)).toMatchObject({ y: yPiso(0), caminando: false });
    expect(aseo((baja.t + fin.t) / 2)).toMatchObject({ y: yPiso(0), caminando: false });
    expect(aseo(fin.t + SALIDA_S / 2)?.caminando).toBe(true);
    expect(aseo(fin.t + SALIDA_S + 0.1)).toBeUndefined();
  });

  it('en el sótano la cabina está abajo con las puertas abiertas cuando baja el aseo', () => {
    const c = cabinaEn(ix, baja.t + 0.1);
    expect(c.piso).toBe(0);
    expect(c.puertas).toBe(1);
  });
});

describe('las escaleras', () => {
  const traza = trazaDe(escenario(Array.from({ length: 12 }, (_, i) => persona(i, 0, 5))), 1);
  const ix = construirIndice(traza);
  const quienes = traza.eventos.filter((e) => e.tipo === 'escaleras');

  it('quien se va camina hacia la puerta de las escaleras y desaparece', () => {
    expect(quienes).toHaveLength(2);
    const e = quienes[0];
    if (e.tipo !== 'escaleras') throw new Error('no es escaleras');
    expect(porId(estadoEn(ix, e.t - 0.01), e.persona)?.caminando).toBe(false);
    expect(porId(estadoEn(ix, e.t + ESCALERAS_S / 2), e.persona)?.caminando).toBe(true);
    const cerca = porId(estadoEn(ix, e.t + ESCALERAS_S - 0.01), e.persona)!;
    expect(cerca.x).toBeLessThan(0);
    expect(porId(estadoEn(ix, e.t + ESCALERAS_S + 0.01), e.persona)).toBeUndefined();
  });
});

describe('formatoReloj', () => {
  it('suma los segundos de la corrida a la hora de inicio', () => {
    expect(formatoReloj(12 * 60 + 40, 0)).toBe('12:40:00');
    expect(formatoReloj(12 * 60 + 40, 125.7)).toBe('12:42:05');
    expect(formatoReloj(6 * 60, 3599)).toBe('06:59:59');
  });

  it('no pasa de 23:59:59', () => {
    expect(formatoReloj(23 * 60 + 59, 61)).toBe('00:00:01');
  });
});
