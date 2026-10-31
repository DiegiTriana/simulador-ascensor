import { describe, expect, it } from 'vitest';
import { leerEntero, leerHora, validar, type EntradasTexto } from './validacion.ts';
import { CASO_MIERCOLES } from '../data/casos.ts';

const MIERCOLES: EntradasTexto = {
  horaInicio: '12:40', duracion: '50', llegadasP1: '119', bajan: '19', sillas: '0', muletas: '0', usosAseo: '1',
};
const con = (c: Partial<EntradasTexto>): EntradasTexto => ({ ...MIERCOLES, ...c });
const errores = (c: Partial<EntradasTexto>) => {
  const r = validar(con(c));
  if (r.ok) throw new Error('se esperaba un error');
  return r.errores;
};

describe('leerHora', () => {
  it('acepta HH:MM y H:MM en 24 horas, con espacios', () => {
    expect(leerHora('12:40')).toEqual({ minutos: 760 });
    expect(leerHora(' 6:00 ')).toEqual({ minutos: 360 });
    expect(leerHora('00:00')).toEqual({ minutos: 0 });
    expect(leerHora('23:59')).toEqual({ minutos: 1439 });
  });
  it.each(['', '  ', '24:00', '12:60', '1240', '12.40', '12:4', 'ab:cd', '12:40 pm', '-1:30', '12:40:10'])('rechaza «%s»', (t) => {
    expect('error' in leerHora(t)).toBe(true);
  });
});

describe('leerEntero', () => {
  it('acepta enteros dentro del rango', () => {
    expect(leerEntero('0', 0, 10)).toEqual({ valor: 0 });
    expect(leerEntero(' 10 ', 0, 10)).toEqual({ valor: 10 });
  });
  it.each(['', ' ', 'abc', '5a', '1e3', '-3', '-0', '5,5', '5.5', '5,0', '5.0', ',5', '5.', '+4', '∞', 'NaN', 'Infinity', '1 000'])(
    'rechaza «%s»',
    (t) => expect('error' in leerEntero(t, 0, 10)).toBe(true),
  );
  it('rechaza fuera de rango y números absurdos', () => {
    expect('error' in leerEntero('11', 0, 10)).toBe(true);
    expect('error' in leerEntero('5', 6, 10)).toBe(true);
    expect('error' in leerEntero('99999999999999999999', 0, 10)).toBe(true);
  });
  it('los mensajes dicen el rango y son distintos según el caso', () => {
    const m = (t: string) => (leerEntero(t, 0, 10) as { error: string }).error;
    expect(m('')).toMatch(/vacío/);
    expect(m('-3')).toMatch(/negativo/);
    expect(m('5,5')).toMatch(/decimales/);
    expect(m('abc')).toMatch(/cifras/);
    expect(m('11')).toMatch(/entre 0 y 10/);
  });
});

describe('validar', () => {
  it('acepta el caso del miércoles y lo convierte', () => {
    const r = validar(MIERCOLES);
    expect(r.ok && r.entradas).toEqual(CASO_MIERCOLES);
  });

  it('acepta los extremos del rango', () => {
    expect(validar(con({ horaInicio: '06:00', duracion: '960', llegadasP1: '3000', bajan: '1000', sillas: '20', muletas: '50', usosAseo: '50' })).ok).toBe(true);
    expect(validar(con({ horaInicio: '22:04', duracion: '1', llegadasP1: '0', bajan: '0', sillas: '0', muletas: '0', usosAseo: '0' })).ok).toBe(true);
  });

  it('rechaza lo que pasa de los extremos', () => {
    expect(errores({ horaInicio: '05:59' }).horaInicio).toBeDefined();
    expect(errores({ horaInicio: '22:05' }).horaInicio).toBeDefined();
    expect(errores({ duracion: '0' }).duracion).toBeDefined();
    expect(errores({ horaInicio: '06:00', duracion: '961' }).duracion).toBeDefined();
    expect(errores({ llegadasP1: '3001' }).llegadasP1).toBeDefined();
    expect(errores({ bajan: '1001' }).bajan).toBeDefined();
    expect(errores({ sillas: '21', llegadasP1: '100' }).sillas).toBeDefined();
    expect(errores({ muletas: '51', llegadasP1: '100' }).muletas).toBeDefined();
    expect(errores({ usosAseo: '51' }).usosAseo).toBeDefined();
  });

  it('el mensaje de duración dice el máximo posible para esa hora de inicio', () => {
    expect(errores({ horaInicio: '21:00', duracion: '66' }).duracion).toBe('Con inicio a las 21:00, la duración máxima es 65 min.');
    expect(errores({ horaInicio: '22:04', duracion: '2' }).duracion).toBe('Con inicio a las 22:04, la duración máxima es 1 min.');
    expect(validar(con({ horaInicio: '21:00', duracion: '65' })).ok).toBe(true);
  });

  it('con hora de inicio inválida la duración se valida solo contra su propio rango', () => {
    const e = errores({ horaInicio: 'xx', duracion: '961' });
    expect(e.horaInicio).toBeDefined();
    expect(e.duracion).toMatch(/entre 1 y 960/);
  });

  it('reporta todos los campos con error a la vez', () => {
    const e = errores({ horaInicio: '', duracion: 'a', llegadasP1: '-1', bajan: '2,5', sillas: '', muletas: 'x', usosAseo: '1e2' });
    expect(Object.keys(e).sort()).toEqual(['bajan', 'duracion', 'horaInicio', 'llegadasP1', 'muletas', 'sillas', 'usosAseo']);
  });

  it('las sillas y muletas se cuentan dentro de las llegadas', () => {
    expect(errores({ llegadasP1: '5', sillas: '6' }).sillas).toBeDefined();
    expect(errores({ llegadasP1: '5', sillas: '3', muletas: '3' }).muletas).toBeDefined();
    expect(validar(con({ llegadasP1: '5', sillas: '3', muletas: '2' })).ok).toBe(true);
  });

  describe('aviso de saturación', () => {
    it('no bloquea y sale con la tasa esperada en los picos (miércoles: unas 3,7)', () => {
      const r = validar(MIERCOLES);
      expect(r.ok).toBe(true);
      expect(r.ok && r.avisos).toEqual([
        'En los picos se esperan unas 3,7 personas por minuto y el ascensor mueve, en promedio, unas 3,5: muchas se irán por las escaleras.',
      ]);
    });
    it('no sale con pocas llegadas', () => {
      const r = validar(con({ llegadasP1: '60' }));
      expect(r.ok && r.avisos).toEqual([]);
    });
    it('sale con muchas, aunque la duración sea larga', () => {
      const r = validar(con({ horaInicio: '08:00', duracion: '300', llegadasP1: '3000' }));
      expect(r.ok && r.avisos).toHaveLength(1);
    });
  });
});
