// A dónde lleva la página al terminar de simular, y cómo llegar a los resultados.

export type Destino = 'escena' | 'resultados';

/**
 * En escritorio la escena queda fija junto al panel, así que al terminar se baja a los resultados. En celular la
 * escena está arriba y se va con el desplazamiento: se lleva a la persona a la escena (ahí empieza la animación) y
 * desde ahí un botón baja a los resultados. Sin escena (sin WebGL) se va directo a los resultados.
 */
export function destinoAlTerminar(opciones: { escritorio: boolean; hayEscena: boolean }): Destino {
  return !opciones.escritorio && opciones.hayEscena ? 'escena' : 'resultados';
}

const sinMovimiento = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const comportamiento = (): ScrollBehavior => (sinMovimiento() ? 'auto' : 'smooth');

/** El foco va al título de los resultados y la página se desplaza hasta ahí. */
export function irAResultados(): void {
  const titulo = document.getElementById('titulo-resultados');
  titulo?.focus({ preventScroll: true });
  titulo?.scrollIntoView({ behavior: comportamiento(), block: 'start' });
}

/** La página se desplaza a la escena y el foco va al botón «Ver resultados», que es lo siguiente que se puede hacer. */
export function irALaEscena(): void {
  document.getElementById('ver-resultados')?.focus({ preventScroll: true });
  document.querySelector('.escena')?.scrollIntoView({ behavior: comportamiento(), block: 'start' });
}

/** Al llegar un resultado nuevo. */
export function alTerminarDeSimular(): void {
  const escritorio = window.matchMedia('(min-width: 900px)').matches;
  const hayEscena = document.querySelector('.escena-lienzo canvas') !== null;
  if (destinoAlTerminar({ escritorio, hayEscena }) === 'escena') irALaEscena();
  else irAResultados();
}
