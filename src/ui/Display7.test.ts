import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Display7 } from './Display7.tsx';
import { plantillaDe } from './estado.ts';

const html = (texto: string | undefined) =>
  renderToStaticMarkup(createElement(Display7, { texto, plantilla: '88,8', etiqueta: 'prueba' }));
/** La capa de segmentos apagados es todo lo que está antes de la capa encendida. */
const apagados = (h: string) => {
  const desde = h.indexOf('<span class="d7-fondo"');
  const hasta = h.indexOf('</span></span>', desde) + '</span></span>'.length;
  return h.slice(desde, hasta);
};
const encendidos = (h: string) => h.split('<span class="d7-valor"')[1] ?? '';

describe('plantilla con coma', () => {
  it('«20,7» y «8,8» usan la misma plantilla «88,8»', () => {
    expect(plantillaDe('20,7', 3)).toBe('88,8');
    expect(plantillaDe('8,8', 3)).toBe('88,8');
    expect(plantillaDe('0,0', 3)).toBe('88,8');
  });

  it('la capa apagada es idéntica con cualquier valor, y la coma está dibujada en las dos capas', () => {
    const a = html('20,7');
    const b = html('8,8');
    const vacio = html(undefined);
    expect(apagados(a)).toBe(apagados(b));
    expect(apagados(a)).toBe(apagados(vacio));
    expect(a.match(/d7-coma/g)).toHaveLength(2);
    expect(b.match(/d7-coma/g)).toHaveLength(2);
    expect(vacio.match(/d7-coma/g)).toHaveLength(1);
  });

  it('el valor encendido no lleva coma ni punto como texto: la coma se dibuja', () => {
    const valor = encendidos(html('20,7')).replace('d7-coma', '');
    expect(valor).not.toContain(',');
    expect(valor).not.toContain('.');
  });

  it('las cifras quedan en trozos propios a los dos lados de la coma', () => {
    expect(encendidos(html('20,7'))).toMatch(/<span>20<\/span><span class="d7-coma"><\/span><span>7<\/span>/);
  });

  it('el aria-label sigue siendo el texto que se le pasa (con la cifra con coma)', () => {
    const h = renderToStaticMarkup(createElement(Display7, { texto: '20,7', plantilla: '88,8', etiqueta: 'Simulación: 20,7 %' }));
    expect(h).toContain('aria-label="Simulación: 20,7 %"');
  });
});
