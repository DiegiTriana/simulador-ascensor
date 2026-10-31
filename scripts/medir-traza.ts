// Mide el costo de la traza de la corrida animada: tiempo con y sin traza, cantidad de eventos y tamaño.
// Uso: npm run traza

import { performance } from 'node:perf_hooks';
import { CASO_MIERCOLES } from '../src/data/casos.ts';
import { corridaAnimada } from '../src/sim/corridas.ts';
import { validarEntradas } from '../src/sim/llegadas.ts';
import { CONFIG_DEFECTO, simularEntradas } from '../src/sim/simulacion.ts';
import type { Entradas } from '../src/sim/tipos.ts';

const PEOR_CASO: Entradas = {
  horaInicioMin: 6 * 60,
  duracionMin: 960,
  llegadasP1: 3000,
  bajan: 1000,
  sillas: 20,
  muletas: 50,
  usosAseo: 50,
};

const REPETICIONES = 9;
const mediana = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const ms = (x: number) => `${x.toFixed(1)} ms`;
const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

function medir(nombre: string, entradas: Entradas) {
  validarEntradas(entradas);
  simularEntradas(entradas, 1); // calentamiento
  const sin: number[] = [];
  const con: number[] = [];
  for (let i = 0; i < REPETICIONES; i++) {
    let t = performance.now();
    simularEntradas(entradas, 1, CONFIG_DEFECTO);
    sin.push(performance.now() - t);
    t = performance.now();
    corridaAnimada(entradas, 1);
    con.push(performance.now() - t);
  }
  const { traza } = corridaAnimada(entradas, 1);
  const json = JSON.stringify(traza);
  const t0 = performance.now();
  structuredClone(traza); // lo que cuesta mandarla del worker a la página
  const clon = performance.now() - t0;
  const porTipo = new Map<string, number>();
  for (const e of traza.eventos) porTipo.set(e.tipo, (porTipo.get(e.tipo) ?? 0) + 1);

  console.log(`\n${nombre}`);
  console.log(`  personas ${traza.personas.length}, eventos ${traza.eventos.length}, termina en ${(traza.finS / 60).toFixed(0)} min simulados`);
  console.log(`  eventos por tipo: ${[...porTipo].map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`  tamaño en JSON ${kb(json.length)}; copiarla al mandarla de un hilo a otro: ${ms(clon)}`);
  console.log(`  tiempo de una corrida: sin traza ${ms(mediana(sin))}, con traza ${ms(mediana(con))} (mediana de ${REPETICIONES})`);
}

medir('Caso del miércoles', CASO_MIERCOLES);
medir('Peor caso (06:00, 960 min, 3000 llegan, 1000 bajan, 20 sillas, 50 muletas, 50 aseos)', PEOR_CASO);
