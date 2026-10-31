import { useMemo } from 'react';
import { useApp } from '../store/app.ts';
import { MasAyuda } from './Botonera.tsx';
import { CabezaPictograma, Icono } from './Iconos.tsx';
import { DetalleParaLaClase } from './TablaComparativa.tsx';
import {
  barras,
  cabezasQueSeVan,
  conclusion,
  EXPLICACION_PICOS,
  frasePrincipal,
  frasesIndicadores,
  TEXTO_OBSOLETO,
  TEXTO_SIMULANDO,
  TEXTO_VACIO,
  textoAlternativoPictograma,
} from './resultados.ts';
import { indicadoresDe, type Indicadores } from './tabla.ts';

function Pictograma({ pct }: { pct: number }) {
  const sale = cabezasQueSeVan(pct);
  return (
    <figure className="pictograma">
      <div className="cabezas" role="img" aria-label={textoAlternativoPictograma(pct)}>
        {Array.from({ length: 10 }, (_, i) => (
          <CabezaPictograma key={i} seVa={i < sale} />
        ))}
      </div>
      <figcaption aria-hidden="true">
        <span className="leyenda-cabeza">
          <span className="cabeza-chica">
            <CabezaPictograma seVa={false} />
          </span>
          Espera y sube
        </span>
        <span className="leyenda-cabeza">
          <span className="cabeza-chica">
            <CabezaPictograma seVa />
          </span>
          Se va por las escaleras
        </span>
      </figcaption>
    </figure>
  );
}

function Cuerpo({ ind }: { ind: Indicadores }) {
  const frase = frasePrincipal(ind);
  const lista = barras(ind);
  const texto = conclusion(ind);
  const f = frasesIndicadores(ind);
  const datos = [
    { icono: 'fila' as const, frase: f.fila },
    { icono: 'espera' as const, frase: f.espera },
    { icono: 'vuelta' as const, frase: f.vuelta },
  ];
  return (
    <>
      {frase && <p className="frase-principal">{frase}</p>}
      {ind.base === 'picos' && <p className="nota">{EXPLICACION_PICOS}</p>}
      {ind.simulacion !== null && <Pictograma pct={ind.simulacion} />}

      <div className="barras">
        {lista.map((b) => (
          <div key={b.clave} className={`barra barra-${b.clave}`}>
            <p className="barra-titulo">{b.titulo}</p>
            <p className="barra-dato">
              <strong>{b.cada100}</strong> <span className="barra-exacto">({b.exacto})</span>
            </p>
            <div className="pista" aria-hidden="true">
              <div className="relleno" style={{ width: `${b.ancho}%` }} />
            </div>
          </div>
        ))}
      </div>

      {texto && (
        <p className="conclusion">
          <span className="conclusion-icono" aria-hidden="true">
            ✓
          </span>
          <span>{texto}</span>
        </p>
      )}

      <ul className="datos">
        {datos.map(({ icono, frase: fr }) => (
          <li key={icono}>
            <Icono nombre={icono} />
            {fr ? (
              <span>
                {fr.antes}
                <strong>{fr.dato}</strong>
                {fr.despues}
              </span>
            ) : (
              <span>{icono === 'vuelta' ? f.sinVuelta : 'Sin dato.'}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export function Resultados() {
  const fase = useApp((s) => s.fase);
  const resultado = useApp((s) => s.resultado);
  const obsoleto = useApp((s) => s.obsoleto);
  const ind = useMemo(() => (resultado ? indicadoresDe(resultado.entradas, resultado.comparacion) : null), [resultado]);

  return (
    <section className="tarjeta resultados" aria-labelledby="titulo-resultados">
      <header className="resultados-cabecera">
        <h2 id="titulo-resultados" tabIndex={-1}>
          Resultados
        </h2>
        <MasAyuda seccion="resultados" de="resultados" />
      </header>
      {obsoleto && (
        <p role="status" className="obsoleto">
          {TEXTO_OBSOLETO}
        </p>
      )}
      {resultado && ind ? (
        <div key={resultado.id} className="resultados-cuerpo">
          <Cuerpo ind={ind} />
          <DetalleParaLaClase />
        </div>
      ) : (
        <p className="vacio">{fase === 'simulando' ? TEXTO_SIMULANDO : TEXTO_VACIO}</p>
      )}
    </section>
  );
}
