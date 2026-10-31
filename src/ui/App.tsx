import { useEffect, useState } from 'react';
import { useApp } from '../store/app.ts';
import { Ayuda } from './Ayuda.tsx';
import { Botonera } from './Botonera.tsx';
import { Escena } from './Escena.tsx';
import { Aviso, Llamada } from './Llamada.tsx';
import { TablaComparativa } from './TablaComparativa.tsx';
import { Tira } from './Tira.tsx';

const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function App() {
  const [ayuda, setAyuda] = useState(false);
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
        <button type="button" className="redondo redondo-ayuda" aria-haspopup="dialog" aria-label="Ayuda" onClick={() => setAyuda(true)}>
          <span aria-hidden="true">?</span>
        </button>
      </header>
      <main className="cuerpo">
        <Escena />
        <div className="panel" id="botonera" tabIndex={-1}>
          <Botonera />
          <Aviso />
          <Llamada />
          <section className="resultados" aria-labelledby="titulo-resultados">
            <h2 id="titulo-resultados" tabIndex={-1}>
              Resultados
            </h2>
            <Tira />
            <TablaComparativa />
          </section>
        </div>
      </main>
      <Ayuda abierta={ayuda} alCerrar={() => setAyuda(false)} />
    </>
  );
}
