import { beforeEach, describe, expect, it } from 'vitest';
import { CASO_MIERCOLES } from '../data/casos.ts';
import { estadoEn } from '../scene/corrida.ts';
import { corridaAnimada } from '../sim/corridas.ts';
import { AVANCE_MAXIMO_S, VELOCIDADES, VELOCIDAD_INICIAL, useAnimacion } from './animacion.ts';

const { traza } = corridaAnimada(CASO_MIERCOLES, 1);
const estado = () => useAnimacion.getState();

beforeEach(() => {
  useAnimacion.setState(useAnimacion.getInitialState(), true);
});

describe('la corrida animada y su reloj', () => {
  it('sin corrida no hay nada que reproducir ni avanzar', () => {
    expect(estado().corrida).toBeNull();
    estado().reproducir();
    expect(estado().enMarcha).toBe(false);
    expect(estado().avanzar(1)).toBe(false);
  });

  it('al cargar una corrida empieza en el segundo 0, en marcha y a la velocidad inicial', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    expect(estado().corrida?.reloj.t).toBe(0);
    expect(estado().enMarcha).toBe(true);
    expect(estado().velocidad).toBe(VELOCIDAD_INICIAL);
    expect(estado().corrida?.indice.fin).toBe(traza.finS);
  });

  it('con «reducir movimiento» la corrida espera a que la persona la reproduzca', () => {
    estado().cargar(traza, CASO_MIERCOLES, { enMarcha: false });
    expect(estado().enMarcha).toBe(false);
    estado().reproducir();
    expect(estado().enMarcha).toBe(true);
  });

  it('cada corrida nueva tiene su número, y descartar la quita y avisa', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    const a = estado().corrida!.id;
    const saltos = estado().saltos;
    estado().cargar(traza, CASO_MIERCOLES);
    expect(estado().corrida!.id).toBeGreaterThan(a);
    estado().descartar();
    expect(estado().corrida).toBeNull();
    expect(estado().enMarcha).toBe(false);
    expect(estado().saltos).toBeGreaterThan(saltos);
    const saltosDespues = estado().saltos;
    estado().descartar(); // ya no hay nada: no avisa de nuevo
    expect(estado().saltos).toBe(saltosDespues);
  });

  it('el reloj avanza con la velocidad: 1 s real = velocidad s simulados', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    estado().fijarVelocidad(5);
    expect(estado().avanzar(0.1)).toBe(true);
    expect(estado().corrida!.reloj.t).toBeCloseTo(0.5, 9);
    estado().fijarVelocidad(60);
    estado().avanzar(0.1);
    expect(estado().corrida!.reloj.t).toBeCloseTo(0.5 + 6, 9);
  });

  it('solo acepta las velocidades de la lista', () => {
    estado().fijarVelocidad(7);
    expect(estado().velocidad).toBe(VELOCIDAD_INICIAL);
    for (const v of VELOCIDADES) {
      estado().fijarVelocidad(v);
      expect(estado().velocidad).toBe(v);
    }
  });

  it('si el equipo se traba o la pestaña estuvo oculta, el reloj no da un salto', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    estado().fijarVelocidad(10);
    estado().avanzar(3600); // una hora sin cuadros
    expect(estado().corrida!.reloj.t).toBeCloseTo(AVANCE_MAXIMO_S * 10, 9);
  });

  it('llega al final, se detiene y «Reanudar» vuelve a empezar', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    estado().saltarA(traza.finS - 1);
    estado().fijarVelocidad(60);
    estado().avanzar(0.25);
    expect(estado().corrida!.reloj.t).toBe(traza.finS);
    expect(estado().enMarcha).toBe(false);
    expect(estado().terminada).toBe(true);
    estado().alternar();
    expect(estado().corrida!.reloj.t).toBe(0);
    expect(estado().enMarcha).toBe(true);
    expect(estado().terminada).toBe(false);
  });
});

describe('pausar congela todo', () => {
  it('en pausa el reloj no se mueve por más cuadros que pasen, ni cambia nada de lo que se dibuja', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    estado().avanzar(0.2);
    estado().avanzar(0.2);
    estado().pausar();
    const corrida = estado().corrida!;
    const t = corrida.reloj.t;
    const dibujado = estadoEn(corrida.indice, t);
    for (let i = 0; i < 600; i++) expect(estado().avanzar(1 / 60)).toBe(false);
    expect(corrida.reloj.t).toBe(t);
    expect(estadoEn(corrida.indice, corrida.reloj.t)).toEqual(dibujado);
  });

  it('cambiar la velocidad en pausa no mueve nada; al reanudar sigue desde el mismo segundo', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    estado().avanzar(0.2);
    estado().pausar();
    const t = estado().corrida!.reloj.t;
    estado().fijarVelocidad(60);
    estado().avanzar(0.2);
    expect(estado().corrida!.reloj.t).toBe(t);
    estado().reproducir();
    estado().avanzar(0.1);
    expect(estado().corrida!.reloj.t).toBeCloseTo(t + 6, 9);
  });

  it('mover la barra en pausa recoloca todo en ese segundo y sigue en pausa', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    estado().pausar();
    const saltos = estado().saltos;
    estado().saltarA(700);
    expect(estado().corrida!.reloj.t).toBe(700);
    expect(estado().enMarcha).toBe(false);
    expect(estado().saltos).toBeGreaterThan(saltos);
    estado().saltarA(-5);
    expect(estado().corrida!.reloj.t).toBe(0);
    estado().saltarA(1e9);
    expect(estado().corrida!.reloj.t).toBe(traza.finS);
    expect(estado().terminada).toBe(true);
    estado().saltarA(Number.NaN);
    expect(estado().corrida!.reloj.t).toBe(traza.finS);
  });

  it('Reiniciar vuelve al segundo 0 de la misma corrida y la deja en pausa', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    const corrida = estado().corrida!;
    estado().saltarA(900);
    expect(estado().enMarcha).toBe(true);
    estado().reiniciar();
    expect(estado().corrida).toBe(corrida); // la misma corrida: no se simula de nuevo
    expect(corrida.reloj.t).toBe(0);
    expect(estado().enMarcha).toBe(false);
    expect(estado().terminada).toBe(false);
    for (let i = 0; i < 100; i++) expect(estado().avanzar(1 / 60)).toBe(false);
    expect(corrida.reloj.t).toBe(0);
    estado().reproducir();
    expect(estado().enMarcha).toBe(true);
  });

  it('Reiniciar después de terminar también deja la corrida al principio y en pausa; «Ver de nuevo» sí reproduce', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    estado().saltarA(traza.finS);
    expect(estado().terminada).toBe(true);
    estado().reiniciar();
    expect(estado().corrida!.reloj.t).toBe(0);
    expect(estado().terminada).toBe(false);
    expect(estado().enMarcha).toBe(false);
    estado().saltarA(traza.finS);
    estado().alternar();
    expect(estado().corrida!.reloj.t).toBe(0);
    expect(estado().enMarcha).toBe(true);
  });

  it('Reiniciar avisa a la escena para que recoloque todo', () => {
    estado().cargar(traza, CASO_MIERCOLES);
    estado().pausar();
    estado().saltarA(500);
    const antes = estado().saltos;
    estado().reiniciar();
    expect(estado().saltos).toBeGreaterThan(antes);
  });
});
