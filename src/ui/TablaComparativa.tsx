import { useMemo } from 'react';
import { useApp } from '../store/app.ts';
import { construirTabla, filasVacias, type Celda } from './tabla.ts';

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

export function TablaComparativa() {
  const resultado = useApp((s) => s.resultado);
  const obsoleto = useApp((s) => s.obsoleto);

  const tabla = useMemo(() => (resultado ? construirTabla(resultado.entradas, resultado.comparacion) : null), [resultado]);
  const filas = tabla?.filas ?? filasVacias();

  return (
    <div className="tabla-zona">
      {!tabla && (
        <p className="frase frase-vacia">
          Todavía no hay resultados. Carga el caso del miércoles o escribe los datos, y pulsa Simular.
        </p>
      )}
      {tabla?.frase && <p className="frase">{tabla.frase}</p>}
      {obsoleto && (
        <p role="status" className="obsoleto">
          Cambiaste los datos: esta tabla es de la simulación anterior. Pulsa Simular para actualizarla.
        </p>
      )}

      <table role="table" className={tabla ? 'tabla' : 'tabla tabla-vacia'}>
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
            <th scope="col" role="columnheader" className="col-sim">
              Simulación
              <span className="sub">promedio de 10 ± desviación</span>
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {filas.map((f) => (
            <FilaTabla key={f.id} f={f} />
          ))}
          {tabla?.real && (
            <tr role="row" className="fila-real">
              <th scope="row" role="rowheader">
                Real, miércoles
                <span className="detalle">lo que se contó en el edificio</span>
              </th>
              <td role="cell" colSpan={3} data-label="Contado" className="real-valores">
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

      <p className="nota-tabla">
        λ es personas ÷ duración; μ es la que mide la simulación. Cada número de la simulación es el promedio de 10 corridas y el ± es la desviación entre ellas. La Ayuda explica cada fila.
      </p>
    </div>
  );
}

function FilaTabla({ f }: { f: ReturnType<typeof filasVacias>[number] }) {
  return (
    <tr role="row" className={f.destacada ? 'fila-destacada' : undefined}>
      <th scope="row" role="rowheader">
        {f.etiqueta}
        {f.detalle && <span className="detalle">{f.detalle}</span>}
      </th>
      <td role="cell" data-label="Fórmulas, toda la franja">
        <Valor celda={f.franja} />
      </td>
      <td role="cell" data-label="Fórmulas, picos">
        <Valor celda={f.picos} />
      </td>
      <td role="cell" data-label="Simulación" className="col-sim">
        <Valor celda={f.sim} />
      </td>
    </tr>
  );
}
