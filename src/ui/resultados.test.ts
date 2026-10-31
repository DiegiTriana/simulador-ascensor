import { describe, expect, it } from 'vitest';
import { CASO_MIERCOLES } from '../data/casos.ts';
import { comparar, correrVarias } from '../sim/corridas.ts';
import {
  barras,
  cabezasQueSeVan,
  conclusion,
  decenasDeCien,
  duracionTexto,
  frasePrincipal,
  frasesIndicadores,
  LEYENDA,
  TEXTO_VACIO,
  textoAlternativoPictograma,
} from './resultados.ts';
import { indicadoresDe, type Indicadores } from './tabla.ts';

const base: Indicadores = { base: 'picos', simulacion: 20.65, formulas: 12.8, real: 20.6, filaMaxima: 19.8, esperaSeg: 64.07, vueltaSeg: 165.5 };
const con = (c: Partial<Indicadores>): Indicadores => ({ ...base, ...c });

describe('redondeos', () => {
  it('«de cada 100» redondea al entero y no pasa de 0 a 100', () => {
    expect(decenasDeCien(20.65)).toBe(21);
    expect(decenasDeCien(12.8)).toBe(13);
    expect(decenasDeCien(0.4)).toBe(0);
    expect(decenasDeCien(100.2)).toBe(100);
    expect(decenasDeCien(-1)).toBe(0);
  });

  it('las cabecitas marcadas son el porcentaje entre 10, redondeado', () => {
    expect(cabezasQueSeVan(20.7)).toBe(2);
    expect(cabezasQueSeVan(14.9)).toBe(1);
    expect(cabezasQueSeVan(15)).toBe(2);
    expect(cabezasQueSeVan(4.9)).toBe(0);
    expect(cabezasQueSeVan(5)).toBe(1);
    expect(cabezasQueSeVan(100)).toBe(10);
    expect(cabezasQueSeVan(0)).toBe(0);
  });

  it('los tiempos salen en minutos y segundos', () => {
    expect(duracionTexto(64.07)).toBe('1 min 4 s');
    expect(duracionTexto(165.5)).toBe('2 min 46 s');
    expect(duracionTexto(60)).toBe('1 min');
    expect(duracionTexto(59.4)).toBe('59 s');
    expect(duracionTexto(0)).toBe('0 s');
  });
});

describe('frase principal', () => {
  it('en los picos dice «de cada 100… unas N» con N redondeado de la simulación', () => {
    expect(frasePrincipal(base)).toBe('En la hora pico, de cada 100 personas que llegan al ascensor, unas 21 se van por las escaleras.');
  });

  it('sin picos no habla de la hora pico', () => {
    expect(frasePrincipal(con({ base: 'total', simulacion: 4.4 }))).toBe('De cada 100 personas que llegan al ascensor, unas 4 se van por las escaleras.');
  });

  it('cuida el singular y el cero', () => {
    expect(frasePrincipal(con({ simulacion: 1.2 }))).toContain('de cada 100 personas que llegan al ascensor, una se van');
    expect(frasePrincipal(con({ simulacion: 0.2 }))).toContain('casi ninguna se van');
  });

  it('sin dato de la simulación no hay frase', () => {
    expect(frasePrincipal(con({ simulacion: null }))).toBeNull();
  });
});

describe('pictograma', () => {
  it('el texto alternativo cuenta cuántas cabecitas se van y cuántas esperan', () => {
    expect(textoAlternativoPictograma(20.7)).toBe('2 de cada 10 personas se van por las escaleras: 8 esperan y 2 marcadas con una escalera se van.');
    expect(textoAlternativoPictograma(9)).toBe('1 de cada 10 personas se van por las escaleras: 9 esperan y 1 cabeza marcada con una escalera se va.');
    expect(textoAlternativoPictograma(1)).toContain('Casi nadie');
  });
});

describe('barras', () => {
  it('con el caso del miércoles son tres, en este orden, con el mismo formato', () => {
    const b = barras(base);
    expect(b.map((x) => x.clave)).toEqual(['real', 'simulacion', 'formulas']);
    expect(b.map((x) => x.titulo)).toEqual([
      'Lo que pasó el miércoles (contado)',
      'Lo que da la simulación',
      'Lo que dan las fórmulas de clase',
    ]);
    expect(b.map((x) => x.cada100)).toEqual(['21 de cada 100', '21 de cada 100', '13 de cada 100']);
    expect(b.map((x) => x.exacto)).toEqual(['20,6 %', '20,7 %', '12,8 %']);
    expect(b[1].ancho).toBeCloseTo(20.65, 2);
  });

  it('sin el caso del miércoles no hay barra de lo real', () => {
    expect(barras(con({ real: null })).map((x) => x.clave)).toEqual(['simulacion', 'formulas']);
  });

  it('salen de las mismas cifras que la tabla (semilla 1, caso del miércoles)', () => {
    const c = comparar(CASO_MIERCOLES, correrVarias(CASO_MIERCOLES, 3, 1));
    const ind = indicadoresDe(CASO_MIERCOLES, c);
    const b = barras(ind);
    expect(b).toHaveLength(3);
    expect(b[0].exacto).toBe('20,6 %');
    expect(Number(b[1].exacto.replace(',', '.').replace(' %', ''))).toBeGreaterThan(Number(b[2].exacto.replace(',', '.').replace(' %', '')));
  });
});

describe('conclusión', () => {
  it('si la simulación se parece a lo real y las fórmulas se quedan cortas, lo dice con la razón', () => {
    const c = conclusion(base);
    expect(c).toContain('La simulación se parece a lo que pasó el miércoles (20,7 % contra 20,6 %).');
    expect(c).toContain('Las fórmulas de clase se quedan cortas (12,8 %)');
    expect(c).toContain('el ascensor sube en tandas de hasta 10 y quien no cabe se va por las escaleras');
  });

  it('si la simulación no se parece a lo real, no dice que se parece', () => {
    const c = conclusion(con({ simulacion: 30 }));
    expect(c).not.toContain('se parece a lo que pasó');
    expect(c).toContain('no se parecen tanto');
  });

  it('si las fórmulas no dan menos, no dice que se quedan cortas', () => {
    expect(conclusion(con({ formulas: 25 }))).not.toContain('cortas');
    expect(conclusion(con({ formulas: 20.9 }))).toContain('cifra parecida');
  });

  it('sin el caso del miércoles no compara con lo real', () => {
    const c = conclusion(con({ real: null }));
    expect(c).not.toContain('miércoles');
    expect(c).toContain('se quedan cortas');
  });

  it('sin dato, no hay conclusión', () => {
    expect(conclusion(con({ simulacion: null }))).toBeNull();
    expect(conclusion(con({ real: null, formulas: 40 }))).toBeNull();
  });
});

describe('frases de los indicadores pequeños', () => {
  it('cuentan la fila, la espera y la vuelta en palabras', () => {
    const f = frasesIndicadores(base);
    expect(f.fila).toEqual({ antes: 'La fila llegó a tener ', dato: '20 personas', despues: '.' });
    expect(f.espera).toEqual({ antes: 'Se esperó en promedio ', dato: '1 min 4 s', despues: '.' });
    expect(f.vuelta).toEqual({ antes: 'El ascensor tarda ', dato: '2 min 46 s', despues: ' en subir y volver.' });
  });

  it('una sola persona va en singular y sin dato no hay frase', () => {
    expect(frasesIndicadores(con({ filaMaxima: 1 })).fila?.dato).toBe('1 persona');
    const f = frasesIndicadores(con({ esperaSeg: null, vueltaSeg: null, filaMaxima: null }));
    expect(f.fila).toBeNull();
    expect(f.espera).toBeNull();
    expect(f.vuelta).toBeNull();
    expect(f.sinVuelta).toContain('no se llenó');
  });
});

describe('estado vacío y leyenda', () => {
  it('el estado vacío dice qué hacer', () => {
    expect(TEXTO_VACIO).toBe('Aún no hay resultados. Completa los pasos 1 a 3 (o carga el caso del miércoles) y pulsa Simular.');
  });

  it('la leyenda explica cada símbolo de la tabla y el ±', () => {
    expect(LEYENDA.map((s) => s.id)).toEqual(['lambda', 'mu', 'rho', 'L', 'Lq', 'W', 'Wq', 'PK', 'lambdaEf', 'pm']);
    expect(LEYENDA.every((s) => s.texto.length > 10)).toBe(true);
  });
});
