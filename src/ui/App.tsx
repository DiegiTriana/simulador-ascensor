import { useEffect } from 'react';
import { useApp } from '../store/app.ts';
import { Ayuda } from './Ayuda.tsx';
import { Botonera } from './Botonera.tsx';
import { Escena } from './Escena.tsx';
import { Resultados } from './Resultados.tsx';

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function App() {
  const ayuda = useApp((s) => s.ayuda);
  const abrirAyuda = useApp((s) => s.abrirAyuda);
  const cerrarAyuda = useApp((s) => s.cerrarAyuda);
  const idResultado = useApp((s) => s.resultado?.id);

  // Al llegar un resultado nuevo, el foco va al título de resultados y la página se desplaza hasta ahí.
  useEffect(() => {
    if (idResultado === undefined) return;
    const titulo = document.getElementById('titulo-resultados');
    titulo?.focus({ preventScroll: true });
    titulo?.scrollIntoView({ behavior: sinMovimiento() ? 'auto' : 'smooth', block: 'start' });
  }, [idResultado]);

  return (
    <>
      <a className="saltar" href="#botonera">
        Ir a los datos
      </a>
      <header className="encabezado">
        <h1>Simulador del ascensor</h1>
        <button type="button" className="boton-ayuda" aria-haspopup="dialog" aria-label="Ayuda" onClick={() => abrirAyuda('general')}>
          <span aria-hidden="true">?</span>
        </button>
      </header>
      <main className="cuerpo">
        <Escena />
        <div className="panel" id="botonera" tabIndex={-1}>
          <Botonera />
          <Resultados />
        </div>
      </main>
      <Ayuda seccion={ayuda} alCerrar={cerrarAyuda} />
    </>
  );
}
