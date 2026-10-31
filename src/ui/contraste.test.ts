// Contraste (WCAG 2.x) de las parejas de colores que usa la interfaz, leídas de los colores de estilos.css.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./estilos.css', import.meta.url), 'utf8');
const raiz = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
const color = (nombre: string): string => {
  const m = new RegExp(`--${nombre}: *(#[0-9a-fA-F]{6})`).exec(raiz);
  if (!m) throw new Error(`Falta el color --${nombre}`);
  return m[1];
};

const luz = (hex: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contraste = (a: string, b: string): number => {
  const [x, y] = [luz(a), luz(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const BLANCO = '#ffffff';

describe('contraste del texto (mínimo 4,5)', () => {
  const texto: [string, string, string][] = [
    ['tinta', 'tarjeta', 'texto principal sobre tarjeta'],
    ['tinta', 'fondo', 'texto principal sobre el fondo'],
    ['tinta-2', 'tarjeta', 'texto secundario sobre tarjeta'],
    ['tinta-2', 'fondo', 'texto secundario sobre el fondo'],
    ['tinta-2', 'marco-escena', 'etiqueta sobre el marco de la escena'],
    ['tinta-2', 'se-va-fondo', 'leyenda sobre la cabeza marcada'],
    ['sim-t', 'tarjeta', 'título de la barra de la simulación'],
    ['form-t', 'tarjeta', 'título de la barra de las fórmulas'],
    ['real-t', 'tarjeta', 'título de la barra de lo real'],
    ['real-t', 'acierto-fondo', 'fila Real de la tabla y conclusión'],
    ['error', 'tarjeta', 'mensaje de error'],
    ['error', 'error-fondo', 'aviso de resultados desactualizados'],
    ['tinta', 'aviso-fondo', 'aviso de saturación'],
    ['acento', 'tarjeta', 'enlaces y foco sobre tarjeta'],
  ];
  it.each(texto)('%s sobre %s (%s)', (t, f) => {
    expect(contraste(color(t), color(f))).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto de Simular (blanco) sobre el acento activo y sobre el acento mientras corre', () => {
    expect(contraste(BLANCO, color('acento'))).toBeGreaterThanOrEqual(4.5);
    expect(contraste(BLANCO, color('acento-os'))).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto blanco de los círculos de paso, aviso y conclusión', () => {
    expect(contraste(BLANCO, color('aviso-icono'))).toBeGreaterThanOrEqual(4.5);
    expect(contraste(BLANCO, color('real-t'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('contraste de los gráficos (mínimo 3)', () => {
  it.each([['sim'], ['form'], ['real']])('la barra %s se distingue de su pista', (b) => {
    expect(contraste(color(b), color('pista'))).toBeGreaterThanOrEqual(3);
  });
  it('el borde de los controles se distingue de la tarjeta', () => {
    expect(contraste(color('control'), color('tarjeta'))).toBeGreaterThanOrEqual(3);
  });
});
