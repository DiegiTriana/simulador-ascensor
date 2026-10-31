import { describe, expect, it } from 'vitest';
import { CASO_MIERCOLES } from '../data/casos.ts';
import { corridaAnimada, correrVarias, semillaDeCorrida } from './corridas.ts';
import { generarEscenario } from './llegadas.ts';
import { CONFIG_DEFECTO, simular, simularEntradas } from './simulacion.ts';
import { crearTraza, type Entradas, type Escenario, type EventoTraza, type Persona, type Resultado, type Traza } from './tipos.ts';

const CON_ESPECIALES: Entradas = {
  horaInicioMin: 7 * 60, duracionMin: 60, llegadasP1: 80, bajan: 30, sillas: 3, muletas: 4, usosAseo: 3,
};
const CORTA_CON_ESPECIALES: Entradas = {
  horaInicioMin: 15 * 60, duracionMin: 20, llegadasP1: 60, bajan: 5, sillas: 2, muletas: 2, usosAseo: 2,
};
const CASOS: [string, Entradas][] = [
  ['caso del miércoles', CASO_MIERCOLES],
  ['con sillas, muletas y aseo', CON_ESPECIALES],
  ['franja corta con especiales', CORTA_CON_ESPECIALES],
];
const SEMILLAS = Array.from({ length: 12 }, (_, i) => i + 1);

function persona(id: number, llegada: number, destino: number, extra: Partial<Persona> = {}): Persona {
  return {
    id, tipo: 'normal', cupos: 1, origen: 1, destino, llegada, inicial: false, enPico: false,
    abordo: null, bajo: null, seFue: false, ...extra,
  };
}
function escenario(personas: Persona[], extra: Partial<Escenario> = {}): Escenario {
  return { duracionS: 600, personas, solicitudesAseo: [], ventanasPico: [], ...extra };
}
function conTraza(esc: Escenario, semilla = 1, cfg = CONFIG_DEFECTO) {
  const traza = crearTraza();
  const resultado = simular(esc, semilla, cfg, traza);
  return { resultado, traza };
}
const de = <T extends EventoTraza['tipo']>(traza: Traza, tipo: T) =>
  traza.eventos.filter((e): e is Extract<EventoTraza, { tipo: T }> => e.tipo === tipo);

describe('la traza no cambia nada de lo que se calcula', () => {
  for (const [nombre, entradas] of CASOS) {
    it(`el Resultado es idéntico con y sin traza (${nombre}, 12 semillas)`, () => {
      for (const semilla of SEMILLAS) {
        const sin = simularEntradas(entradas, semilla);
        const con = simularEntradas(entradas, semilla, CONFIG_DEFECTO, {}, crearTraza());
        expect(con).toEqual(sin);
      }
    });
  }

  it('sigue igual cuando el azar de las escaleras se usa de verdad (85 %, 50 % y 100 % de irse)', () => {
    for (const probEscaleras of [0.85, 0.5, 1]) {
      const cfg = { ...CONFIG_DEFECTO, probEscaleras };
      for (const semilla of SEMILLAS) {
        const esc = generarEscenario(CASO_MIERCOLES, semilla);
        expect(simular(esc, semilla, cfg, crearTraza())).toEqual(simular(esc, semilla, cfg));
      }
    }
  });

  it('la misma corrida da siempre la misma traza', () => {
    const a = corridaAnimada(CASO_MIERCOLES, 5);
    const b = corridaAnimada(CASO_MIERCOLES, 5);
    expect(b.traza).toEqual(a.traza);
    expect(b.resultado).toEqual(a.resultado);
  });

  it('simular sin traza no pide ni deja nada', () => {
    const r: Resultado = simularEntradas(CASO_MIERCOLES, 1);
    expect(r.llegadas).toBeGreaterThan(0);
  });
});

describe('la corrida animada es la corrida 1 de la tabla', () => {
  it('su resultado es igual, dato por dato, a la primera de las 10 corridas, con varias semillas base', () => {
    for (const base of [1, 7, 42]) {
      const tabla = correrVarias(CASO_MIERCOLES, 10, base);
      const animada = corridaAnimada(CASO_MIERCOLES, base);
      expect(animada.resultado).toEqual(tabla[0]);
      expect(animada.resultado.semilla).toBe(semillaDeCorrida(base, 0));
    }
  });

  it('también con sillas, muletas y aseo', () => {
    for (const [, entradas] of CASOS) {
      expect(corridaAnimada(entradas, 3).resultado).toEqual(correrVarias(entradas, 10, 3)[0]);
    }
  });

  it('la semilla de la corrida i es la base más i (la misma regla del worker)', () => {
    expect(semillaDeCorrida(1, 0)).toBe(1);
    expect(semillaDeCorrida(1, 9)).toBe(10);
    const tabla = correrVarias(CASO_MIERCOLES, 3, 4);
    expect(tabla.map((r) => r.semilla)).toEqual([4, 5, 6]);
  });

  it('la lista de personas de la traza es la del escenario de esa semilla, más el personal de aseo (−1)', () => {
    const { traza } = corridaAnimada(CASO_MIERCOLES, 1);
    const esc = generarEscenario(CASO_MIERCOLES, 1);
    expect(traza.personas).toHaveLength(esc.personas.length + 1);
    esc.personas.forEach((p, i) => {
      expect(traza.personas[i]).toEqual({
        id: p.id, tipo: p.tipo, cupos: p.cupos, origen: p.origen, destino: p.destino, llegada: p.llegada,
      });
    });
    expect(traza.personas.at(-1)).toMatchObject({ id: -1, tipo: 'aseo', origen: 1, destino: 0 });
  });
});

/** Recorre la traza como lo haría la escena y comprueba que cuenta una historia posible. */
function comprobarCoherencia(traza: Traza, resultado: Resultado) {
  const EPS = 1e-6;
  const porId = new Map(traza.personas.map((p) => [p.id, p]));
  let piso = 1;
  let estado: 'cerrada' | 'abriendo' | 'abierta' | 'cerrando' = 'cerrada';
  let tAnterior = 0;
  let libreDesde = 0; // la cabina no puede hacer nada antes de llegar
  let tAbre = 0;
  let tAbierta = 0;
  let tCierra = 0;
  let finMovimientos = 0;
  const subio = new Map<number, number>();
  const bajo = new Map<number, number>();
  const seFue = new Set<number>();
  let abordo1 = 0;
  let aseoSube = 0;

  for (const e of traza.eventos) {
    expect(e.t, 'eventos fuera de orden').toBeGreaterThanOrEqual(tAnterior - EPS);
    tAnterior = e.t;
    switch (e.tipo) {
      case 'mueve':
        expect(estado).toBe('cerrada');
        expect(e.desde).toBe(piso);
        expect(Math.abs(e.hacia - e.desde)).toBe(1);
        expect(e.hacia).toBeGreaterThanOrEqual(0);
        expect(e.hacia).toBeLessThanOrEqual(9);
        expect(e.t).toBeGreaterThanOrEqual(libreDesde - EPS);
        expect(e.llega - e.t).toBeCloseTo(5, 6);
        piso = e.hacia;
        libreDesde = e.llega;
        break;
      case 'abre':
        expect(estado).toBe('cerrada');
        expect(e.piso).toBe(piso);
        expect(e.t).toBeGreaterThanOrEqual(libreDesde - EPS);
        estado = 'abriendo';
        tAbre = e.t;
        break;
      case 'abierta':
        expect(estado).toBe('abriendo');
        expect(e.piso).toBe(piso);
        expect(e.t - tAbre).toBeCloseTo(3.3, 6);
        estado = 'abierta';
        tAbierta = e.t;
        finMovimientos = e.t;
        break;
      case 'sube':
      case 'baja': {
        expect(estado, `${e.tipo} con las puertas ${estado}`).toBe('abierta');
        expect(e.piso).toBe(piso);
        expect(e.t).toBeGreaterThanOrEqual(Math.max(tAbierta, finMovimientos) - EPS);
        finMovimientos = e.t + 2;
        const p = porId.get(e.persona);
        expect(p, `persona ${e.persona} no está en la lista`).toBeDefined();
        if (e.tipo === 'sube') {
          expect(subio.has(e.persona), `persona ${e.persona} sube dos veces`).toBe(false);
          expect(e.piso).toBe(p!.origen);
          if (e.persona >= 0) expect(e.t).toBeGreaterThanOrEqual(p!.llegada - EPS);
          subio.set(e.persona, e.t);
          if (e.persona >= 0 && p!.origen === 1) abordo1++;
          if (e.persona === -1) aseoSube++;
        } else {
          expect(subio.has(e.persona), `persona ${e.persona} baja sin haber subido`).toBe(true);
          expect(e.t).toBeGreaterThan(subio.get(e.persona)!);
          expect(e.piso).toBe(p!.destino);
          bajo.set(e.persona, e.t);
          // Lo que sube en un piso y baja en el mismo no existe.
          expect(p!.destino).not.toBe(p!.origen);
          if (e.persona === -1) subio.delete(-1); // el aseo puede volver a usar el ascensor
        }
        break;
      }
      case 'cierra':
        expect(estado).toBe('abierta');
        expect(e.piso).toBe(piso);
        // Las puertas no se cierran hasta que termina el último movimiento.
        expect(e.t).toBeGreaterThanOrEqual(finMovimientos - EPS);
        estado = 'cerrando';
        tCierra = e.t;
        break;
      case 'escaleras':
        expect(estado).toBe('cerrando');
        expect(piso).toBe(1);
        expect(e.t).toBeCloseTo(tCierra, 6);
        expect(porId.get(e.persona)?.tipo).toBe('normal');
        expect(subio.has(e.persona)).toBe(false);
        expect(seFue.has(e.persona), `persona ${e.persona} se va dos veces`).toBe(false);
        seFue.add(e.persona);
        break;
      case 'cerrada':
        expect(estado).toBe('cerrando');
        expect(e.piso).toBe(piso);
        expect(e.t - tCierra).toBeCloseTo(4.3, 6);
        estado = 'cerrada';
        libreDesde = Math.max(libreDesde, e.t);
        break;
      case 'aseoTermina':
        break;
    }
  }

  // Con la corrida terminada, nadie queda a bordo y las cuentas de la traza son las del resultado.
  for (const [id] of subio) expect(bajo.has(id) || id === -1, `persona ${id} queda a bordo`).toBe(true);
  expect(seFue.size).toBe(resultado.abandonos);
  expect(abordo1).toBe(resultado.abordaron);
  expect(aseoSube).toBe(resultado.aseoAtendidos);
  expect(traza.finS).toBeGreaterThanOrEqual(tAnterior);
}

describe('la traza cuenta una historia posible', () => {
  for (const [nombre, entradas] of CASOS) {
    it(`puertas, cabina y personas son coherentes (${nombre}, 6 semillas)`, () => {
      for (const semilla of [1, 2, 3, 4, 5, 6]) {
        const { resultado, traza } = corridaAnimada(entradas, semilla);
        comprobarCoherencia(traza, resultado);
      }
    });
  }

  it('quienes bajan (origen mayor que P1) también suben y bajan en sus pisos', () => {
    const { traza } = corridaAnimada(CASO_MIERCOLES, 1);
    const bajan = traza.personas.filter((p) => p.origen > 1);
    expect(bajan.length).toBeGreaterThan(0);
    const subieron = new Set(de(traza, 'sube').map((e) => e.persona));
    expect(bajan.filter((p) => subieron.has(p.id)).length).toBeGreaterThan(0);
  });
});

describe('casos pequeños hechos a mano', () => {
  it('tres personas de P1 a P5: abren a los 3,3 s y suben de a una, cada 2 s', () => {
    const { traza } = conTraza(escenario([persona(0, 0, 5), persona(1, 0, 5), persona(2, 0, 5)]));
    expect(de(traza, 'abre')[0]).toMatchObject({ t: 0, piso: 1 });
    expect(de(traza, 'abierta')[0].t).toBeCloseTo(3.3, 6);
    const sube = de(traza, 'sube');
    expect(sube.map((e) => e.t)).toEqual([3.3, 5.3, 7.3].map((t) => expect.closeTo(t, 6)));
    expect(sube.map((e) => e.persona)).toEqual([0, 1, 2]);
    // Con tres movimientos las puertas quedan abiertas 6 s: cierran a los 9,3 s y quedan cerradas a los 13,6 s.
    expect(de(traza, 'cierra')[0].t).toBeCloseTo(9.3, 6);
    expect(de(traza, 'cerrada')[0].t).toBeCloseTo(13.6, 6);
    // Cuatro pisos de P1 a P5: llegan 20 s después de salir.
    const primera = de(traza, 'mueve')[0];
    expect(primera.t).toBeCloseTo(13.6, 6);
    expect(de(traza, 'mueve')).toHaveLength(4);
  });

  it('con 12 personas y todas dispuestas a irse, 10 suben y 2 se van por las escaleras al cerrar', () => {
    const personas = Array.from({ length: 12 }, (_, i) => persona(i, 0, 5));
    const { traza } = conTraza(escenario(personas), 1, { ...CONFIG_DEFECTO, probEscaleras: 1 });
    expect(de(traza, 'sube')).toHaveLength(10);
    const escaleras = de(traza, 'escaleras');
    expect(escaleras.map((e) => e.persona).sort((a, b) => a - b)).toEqual([10, 11]);
    const cierra = de(traza, 'cierra')[0];
    expect(cierra.t).toBeCloseTo(3.3 + 20, 6);
    for (const e of escaleras) expect(e.t).toBeCloseTo(cierra.t, 6);
  });

  it('quien llega con las puertas abiertas y cabe sube justo después de quien ya estaba subiendo', () => {
    const { traza } = conTraza(escenario([persona(0, 0, 5), persona(1, 4, 5)]));
    const sube = de(traza, 'sube');
    expect(sube[0].persona).toBe(0);
    expect(sube[1].persona).toBe(1);
    expect(sube[1].t).toBeGreaterThanOrEqual(sube[0].t + 2 - 1e-9);
  });

  it('el aseo va a P1, baja al sótano y termina 150 s después de abrir en P1', () => {
    const { traza, resultado } = conTraza(escenario([], { solicitudesAseo: [5] }));
    expect(resultado.aseoAtendidos).toBe(1);
    const sube = de(traza, 'sube');
    const baja = de(traza, 'baja');
    expect(sube).toEqual([expect.objectContaining({ persona: -1, piso: 1 })]);
    expect(baja).toEqual([expect.objectContaining({ persona: -1, piso: 0 })]);
    const abiertaP1 = de(traza, 'abierta').find((e) => e.piso === 1)!;
    const fin = de(traza, 'aseoTermina');
    expect(fin).toHaveLength(1);
    expect(fin[0].t).toBeCloseTo(abiertaP1.t + 150, 6);
    expect(fin[0].t).toBeGreaterThanOrEqual(baja[0].t);
    comprobarCoherencia(traza, resultado);
  });

  it('sin nadie, no hay eventos', () => {
    const { traza } = conTraza(escenario([]));
    expect(traza.eventos).toEqual([]);
    expect(traza.personas).toEqual([{ id: -1, tipo: 'aseo', cupos: 1, origen: 1, destino: 0, llegada: 0 }]);
  });
});
