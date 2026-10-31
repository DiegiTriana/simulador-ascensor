// Punto de control de la fase 1: caso del miércoles contra las referencias.
// Uso: npm run tabla [-- corridas]

import { CASO_MIERCOLES } from '../src/data/casos.ts';
import { comparar, correrVarias, type Estadistica } from '../src/sim/corridas.ts';

const n = Number(process.argv[2] ?? 30);
const corridas = correrVarias(CASO_MIERCOLES, n, 1);
const c = comparar(CASO_MIERCOLES, corridas);

const f = (e: Estadistica | null | undefined, d = 1) => (e ? `${e.media.toFixed(d)} ± ${e.sd.toFixed(d)}` : '—');
const x = (v: number | undefined, d = 1) => (v === undefined ? '—' : v.toFixed(d));

console.log(`Caso del miércoles, ${n} corridas (semillas 1..${n}); ± es la desviación estándar entre corridas\n`);
console.log('Simulación');
console.log(`  Se van por las escaleras, en picos (%)   ${f(c.sim.abandonoPicoPct)}   (real 20,6; prototipo 22,0 ± 1,7)`);
console.log(`  Se van por las escaleras, total (%)      ${f(c.sim.abandonoPct)}   (real 18,5)`);
console.log(`  λ en picos (personas/min)                ${f(c.sim.lambdaPicoPorMin, 2)}   (datos 3,6–3,7)`);
console.log(`  μ medida (personas/min)                  ${f(c.sim.muPorMin, 2)}   (datos ≈ 3,9)`);
console.log(`  Fila promedio Lq en picos                ${f(c.sim.LqPico, 2)}   (prototipo 6,0)`);
console.log(`  Fila máxima                              ${f(c.sim.filaMaxima)}   (real 16)`);
console.log(`  Espera hasta subir Wq (s)                ${f(c.sim.WqSeg, 0)}`);
console.log(`  Tiempo hasta bajar W (s)                 ${f(c.sim.WSeg, 0)}`);
const vueltasPico = corridas.flatMap((r) => r.vueltas.filter((v) => !v.aseo && v.quedanAfuera > 0 && v.duracion !== null));
const durMedia = vueltasPico.reduce((s, v) => s + (v.duracion as number), 0) / vueltasPico.length;
console.log(`  Duración de vuelta saturada (s)          ${durMedia.toFixed(0)}   (datos 153; rango 120–195)`);

for (const [nombre, m] of [['M/M/1/K con λ y μ de los picos', c.formulasPico], ['M/M/1/K con λ = 119 ÷ 50 min', c.formulasFranja]] as const) {
  console.log(`\n${nombre}  (K = 11)`);
  if (!m) { console.log('  sin datos'); continue; }
  console.log(`  λ = ${x(m.lambda, 2)}  μ = ${x(m.mu, 2)}  ρ = ${x(m.rho, 3)}`);
  console.log(`  P_K (se van) = ${(100 * m.pK).toFixed(1)} %   L = ${x(m.L, 2)}  Lq = ${x(m.Lq, 2)}  W = ${x(m.W * 60, 0)} s  Wq = ${x(m.Wq * 60, 0)} s  λef = ${x(m.lambdaEf, 2)}`);
}

console.log('\nVueltas de la corrida 1 (comparar con V1–V13 del miércoles)');
console.log('  t(s)  esperando suben afuera rechazos dur(s)');
for (const v of corridas[0].vueltas) {
  console.log(`  ${String(Math.round(v.t)).padStart(5)}  ${String(v.esperando).padStart(5)} ${String(v.suben).padStart(6)} ${String(v.quedanAfuera).padStart(5)} ${String(v.rechazos).padStart(7)} ${v.duracion === null ? '—' : Math.round(v.duracion)}${v.aseo ? '  (aseo)' : ''}`);
}

// Sensibilidad: grupos que llegan juntos y suben al mismo piso (opción apagada por defecto).
console.log('\nSensibilidad a grupos que llegan juntos al mismo piso (opcional, no es dato medido)');
console.log('  grupo   escaleras en picos (%)   μ (pers/min)   Lq picos   vuelta saturada (s)');
for (const g of [1, 3, 5, 7]) {
  const cs = comparar(CASO_MIERCOLES, correrVarias(CASO_MIERCOLES, n, 1, { tamanoGrupo: g }));
  const vs = cs.corridas.flatMap((r) => r.vueltas.filter((v) => !v.aseo && v.quedanAfuera > 0 && v.duracion !== null));
  const dur = vs.reduce((acc, v) => acc + (v.duracion as number), 0) / vs.length;
  console.log(`  ${String(g).padStart(5)}   ${f(cs.sim.abandonoPicoPct).padEnd(22)}   ${f(cs.sim.muPorMin, 2).padEnd(12)}   ${f(cs.sim.LqPico, 2).padEnd(8)}   ${dur.toFixed(0)}`);
}
