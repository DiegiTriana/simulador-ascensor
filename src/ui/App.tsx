import { useEffect } from 'react';
import { useApp } from '../store/app.ts';
import { Ayuda } from './Ayuda.tsx';
import { Botonera } from './Botonera.tsx';
import { Escena } from './Escena.tsx';
import { alTerminarDeSimular } from './foco.ts';
import { Resultados } from './Resultados.tsx';

export function App() {
  const ayuda = useApp((s) => s.ayuda);
  const abrirAyuda = useApp((s) => s.abrirAyuda);
  const cerrarAyuda = useApp((s) => s.cerrarAyuda);
  const idResultado = useApp((s) => s.resultado?.id);

  // Al llegar un resultado nuevo: en escritorio, al título de los resultados; en celular, a la escena (ahí empieza
  // la animación) y desde ahí el botón «Ver resultados» baja a ellos.
  useEffect(() => {
    if (idResultado === undefined) return;
    alTerminarDeSimular();
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
