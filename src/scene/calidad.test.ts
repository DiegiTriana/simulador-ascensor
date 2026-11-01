import { describe, expect, it } from 'vitest';
import { CALENTAMIENTO_S, FPS_MINIMOS, NIVELES, NIVEL_MAXIMO, PAUSA_S, VENTANA_S, crearMedidor, nivelInicial } from './calidad.ts';

/** Alimenta al medidor con cuadros de `fps` durante `segundos` y dice cuándo pidió bajar (null si no pidió). */
function correr(medidor: ReturnType<typeof crearMedidor>, fps: number, segundos: number): number | null {
  const dt = 1 / fps;
  for (let t = 0; t < segundos; t += dt) if (medidor.cuadro(dt)) return t;
  return null;
}

describe('medidor de cuadros por segundo', () => {
  it('con 60 cuadros por segundo nunca pide bajar', () => {
    expect(correr(crearMedidor(), 60, 120)).toBeNull();
  });

  it('con 20 cuadros por segundo pide bajar después del calentamiento y de dos ventanas seguidas', () => {
    const t = correr(crearMedidor(), 20, 60);
    expect(t).not.toBeNull();
    expect(t as number).toBeGreaterThanOrEqual(CALENTAMIENTO_S + 2 * VENTANA_S - 0.1);
    expect(t as number).toBeLessThan(CALENTAMIENTO_S + 2 * VENTANA_S + 0.5);
  });

  it('un tropiezo corto (una sola ventana lenta) no baja la calidad', () => {
    const m = crearMedidor();
    expect(correr(m, 60, CALENTAMIENTO_S + 1)).toBeNull();
    expect(correr(m, 15, VENTANA_S)).toBeNull();
    expect(correr(m, 60, 30)).toBeNull();
  });

  it('el calentamiento no cuenta: los cuadros lentos del principio se perdonan', () => {
    const m = crearMedidor();
    expect(correr(m, 10, CALENTAMIENTO_S)).toBeNull();
    expect(correr(m, 60, 30)).toBeNull();
  });

  it('una pausa (cuadro de más de 0,25 s) reinicia la ventana y no se toma por lentitud', () => {
    const m = crearMedidor();
    correr(m, 60, CALENTAMIENTO_S + 0.5);
    expect(correr(m, 15, VENTANA_S - 0.2)).toBeNull();
    expect(m.cuadro(PAUSA_S + 0.01)).toBe(false);
    expect(correr(m, 15, VENTANA_S - 0.2)).toBeNull();
    expect(m.cuadro(5)).toBe(false);
  });

  it('ignora tiempos que no sirven (0, negativos, NaN)', () => {
    const m = crearMedidor();
    for (const dt of [0, -1, Number.NaN]) expect(m.cuadro(dt)).toBe(false);
  });

  it('el umbral es 30: con 31 no baja, con 28 sí', () => {
    expect(FPS_MINIMOS).toBe(30);
    expect(correr(crearMedidor(), 31, 60)).toBeNull();
    expect(correr(crearMedidor(), 28, 60)).not.toBeNull();
  });

  it('al reiniciar vuelve a calentar', () => {
    const m = crearMedidor();
    correr(m, 60, CALENTAMIENTO_S + 5);
    m.reiniciar();
    expect(correr(m, 10, CALENTAMIENTO_S - 0.3)).toBeNull();
  });
});

describe('niveles de calidad', () => {
  it('bajan de a poco: primero sin sombras y después menos resolución, sin subirla', () => {
    expect(NIVELES[0]).toEqual({ sombras: true, dprMax: 2 });
    expect(NIVELES[1].sombras).toBe(false);
    for (let i = 1; i < NIVELES.length; i++) {
      expect(NIVELES[i].sombras).toBe(false);
      expect(NIVELES[i].dprMax).toBeLessThanOrEqual(NIVELES[i - 1].dprMax);
    }
    expect(NIVEL_MAXIMO).toBe(NIVELES.length - 1);
  });

  it('?calidad=N solo vale en desarrollo y dentro de los niveles', () => {
    expect(nivelInicial('?calidad=2', true)).toBe(2);
    expect(nivelInicial('?calidad=2', false)).toBe(0);
    expect(nivelInicial('?calidad=9', true)).toBe(0);
    expect(nivelInicial('?calidad=1.5', true)).toBe(0);
    expect(nivelInicial('', true)).toBe(0);
  });
});
