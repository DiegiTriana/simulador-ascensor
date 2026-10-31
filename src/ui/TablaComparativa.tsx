import { useMemo } from 'react';
import { useApp } from '../store/app.ts';
import { LEYENDA } from './resultados.ts';
import { ConSubindice, Simbolo } from './Subindice.tsx';
import { construirTabla, type Celda, type Fila, type TablaModelo } from './tabla.ts';

function Valor({ celda }: { celda: Celda | null }) {
  if (!celda) {
    return (
      <>
        <span aria-hidden="true">—</span>
        <span className="sr-only">sin dato</span>
      </>
    );
  }
  return (
    <span className="celda">
      <span className="valor">{celda.valor}</span>
      {celda.pm && <span className="pm"> {celda.pm}</span>}
      {celda.picos && (
        <span className="en-picos">
          picos: {celda.picos.valor}
          {celda.picos.pm && <> {celda.picos.pm}</>}
        </span>
      )}
    </span>
  );
}

function FilaTabla({ f }: { f: Fila }) {
  return (
    <tr role="row" className={f.destacada ? 'fila-destacada' : undefined}>
      <th scope="row" role="rowheader">
        {f.etiqueta}
        {f.detalle && (
          <span className="detalle-fila">
            <ConSubindice texto={f.detalle} />
          </span>
        )}
      </th>
      <td role="cell" data-label="Fórmulas, toda la franja">
        <Valor celda={f.franja} />
      </td>
      <td role="cell" data-label="Fórmulas, picos">
        <Valor celda={f.picos} />
      </td>
      <td role="cell" data-label="Simulación">
        <Valor celda={f.sim} />
      </td>
    </tr>
  );
}

function Tabla({ tabla }: { tabla: TablaModelo }) {
  return (
    <table role="table" className="tabla">
      <caption className="sr-only">Comparación entre las fórmulas M/M/1/K y la simulación, promedio de 10 corridas</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader">
            Medida
          </th>
          <th scope="col" role="columnheader">
            Fórmulas
            <span className="sub">toda la franja</span>
          </th>
          <th scope="col" role="columnheader">
            Fórmulas
            <span className="sub">picos</span>
          </th>
          <th scope="col" role="columnheader">
            Simulación
            <span className="sub">promedio de 10 ± desviación</span>
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {tabla.filas.map((f) => (
          <FilaTabla key={f.id} f={f} />
        ))}
        {tabla.real && (
          <tr role="row" className="fila-real">
            <th scope="row" role="rowheader">
              Real, miércoles
              <span className="detalle-fila">lo que se contó en el edificio</span>
            </th>
            <td role="cell" colSpan={3} className="real-valores">
              <span className="celda">
                <span className="valor">{tabla.real.picos}</span> <span className="detalle-inline">en los picos</span>
                <br />
                <span className="valor">{tabla.real.total}</span> <span className="detalle-inline">en toda la franja</span>
              </span>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/** «Detalle para la clase»: qué es cada símbolo y la tabla técnica con las cifras de siempre. */
export function DetalleParaLaClase() {
  const resultado = useApp((s) => s.resultado);
  const tabla = useMemo(() => (resultado ? construirTabla(resultado.entradas, resultado.comparacion) : null), [resultado]);
  if (!tabla) return null;
  return (
    <section className="detalle" aria-labelledby="titulo-detalle">
      <h3 id="titulo-detalle">Detalle para la clase</h3>
      <dl className="simbolos">
        {LEYENDA.map((s) => (
          <div key={s.id}>
            <dt>
              <Simbolo id={s.id} />
            </dt>
            <dd>
              <ConSubindice texto={s.texto} />
            </dd>
          </div>
        ))}
      </dl>
      {tabla.frase && <p className="frase-tabla">{tabla.frase}</p>}
      <Tabla tabla={tabla} />
    </section>
  );
}
