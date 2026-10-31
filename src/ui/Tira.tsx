import { useMemo } from 'react';
import { useApp } from '../store/app.ts';
import { Display7 } from './Display7.tsx';
import { Lamparas } from './Lamparas.tsx';
import { plantillaDe, textoEstado } from './estado.ts';
import { coma, punto } from './formato.ts';
import { indicadoresDe } from './tabla.ts';
import { useValidacion } from './validacionUi.ts';

const pctTexto = (n: number) => (n >= 99.95 ? '100' : punto(n, 1));

/** El único bloque oscuro de la columna: lámparas de progreso, el indicador principal y tres pequeños. */
export function Tira() {
  const fase = useApp((s) => s.fase);
  const progreso = useApp((s) => s.progreso);
  const resultado = useApp((s) => s.resultado);
  const mensajeError = useApp((s) => s.mensajeError);
  const intento = useApp((s) => s.intento);
  const v = useValidacion();

  const ind = useMemo(() => (resultado ? indicadoresDe(resultado.entradas, resultado.comparacion) : null), [resultado]);
  // Esta es la zona que se anuncia con aria-live: también dice cuándo hay campos por corregir.
  const porCorregir = intento && !v.ok;
  const sinResultados = fase === 'inactivo' && !resultado && !porCorregir;
  const texto = sinResultados ? 'Aún no hay resultados. Pulsa Simular.' : textoEstado(fase, progreso, mensajeError, porCorregir);
  const error = fase === 'error';

  const sim = ind?.simulacion != null ? pctTexto(ind.simulacion) : undefined;
  const formulas = ind?.formulas != null ? pctTexto(ind.formulas) : undefined;
  const real = ind?.real != null ? pctTexto(ind.real) : undefined;
  const fila = ind?.filaMaxima != null ? String(Math.round(ind.filaMaxima)) : undefined;
  const espera = ind?.esperaSeg != null ? String(Math.round(ind.esperaSeg)) : undefined;
  const vuelta = ind?.vueltaSeg != null ? String(Math.round(ind.vueltaSeg)) : undefined;
  const lectura = (v: number | null | undefined) => (v == null ? 'sin dato' : `${coma(v)} %`);

  return (
    <section className="tira" aria-label="Indicadores del resultado">
      <div className="tira-estado">
        <Lamparas encendidas={progreso?.hechas ?? 0} />
        <p role="status" className={error ? 'estado-texto estado-error' : 'estado-texto'}>
          {error && (
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
              <path d="M8 1.5 15 14H1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M8 6v4M8 11.6v.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          )}
          {texto}
        </p>
      </div>

      <div key={resultado?.id ?? 'vacio'}>
        <p className="tira-titulo">
          {ind?.base === 'total' ? 'Se van por las escaleras en toda la franja' : 'Se van por las escaleras en los picos'}
        </p>
        <dl className="principal">
          <div className="principal-grande">
            <dt>Simulación</dt>
            <dd>
              <Display7
                tamano="grande"
                texto={sim}
                plantilla={plantillaDe(sim ?? '0.0', 3)}
                etiqueta={`Simulación: ${lectura(ind?.simulacion)}`}
                orden={0}
              />
              <span className="unidad-d7">%</span>
            </dd>
          </div>
          <div>
            <dt>Fórmulas</dt>
            <dd>
              <Display7
                tamano="mediano"
                texto={formulas}
                plantilla={plantillaDe(formulas ?? '0.0', 3)}
                etiqueta={`Fórmulas: ${lectura(ind?.formulas)}`}
                orden={1}
              />
              <span className="unidad-d7">%</span>
            </dd>
          </div>
          {ind?.real != null && (
            <div>
              <dt>Real, miércoles</dt>
              <dd>
                <Display7 tamano="mediano" texto={real} plantilla={plantillaDe(real ?? '0.0', 3)} etiqueta={`Real: ${lectura(ind.real)}`} orden={2} />
                <span className="unidad-d7">%</span>
              </dd>
            </div>
          )}
        </dl>

        <dl className="chicos">
          <div>
            <dt>Fila máxima</dt>
            <dd>
              <Display7 tamano="chico" texto={fila} plantilla={plantillaDe(fila ?? '0', 2)} etiqueta={`Fila máxima: ${fila ?? 'sin dato'} personas`} orden={3} />
              <span className="unidad-d7">personas</span>
            </dd>
          </div>
          <div>
            <dt>Espera media</dt>
            <dd>
              <Display7 tamano="chico" texto={espera} plantilla={plantillaDe(espera ?? '0', 3)} etiqueta={`Espera media: ${espera ?? 'sin dato'} segundos`} orden={4} />
              <span className="unidad-d7">s</span>
            </dd>
          </div>
          <div>
            <dt>Vuelta del ascensor</dt>
            <dd>
              <Display7 tamano="chico" texto={vuelta} plantilla={plantillaDe(vuelta ?? '0', 3)} etiqueta={`Vuelta del ascensor: ${vuelta ?? 'sin dato'} segundos`} orden={5} />
              <span className="unidad-d7">s</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
