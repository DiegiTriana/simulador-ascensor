import { Display7 } from './Display7.tsx';

const PISOS = ['S', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'];
const ALTO_PISO = 52;
const Y_BASE = 520;
/** La cabina apoyada en el piso de P1 (la línea de cada piso está 28 por debajo de su rótulo). */
const Y_CABINA = Y_BASE - ALTO_PISO + 28 - 48;

/** Marco de la escena. La escena 3D llega en la fase 5; mientras tanto, el pozo dibujado y los indicadores apagados. */
export function Escena() {
  return (
    <section className="escena" aria-label="Escena del ascensor">
      <div className="marco sobre-grafito">
        <dl className="marco-indicadores">
          <div>
            <dt>Reloj</dt>
            <dd>
              <Display7 plantilla="88:88" etiqueta="Reloj de la simulación, apagado" />
            </dd>
          </div>
          <div>
            <dt>Piso</dt>
            <dd>
              <Display7 plantilla="8" etiqueta="Piso de la cabina, apagado" />
            </dd>
          </div>
          <div>
            <dt>En cabina</dt>
            <dd>
              <Display7 plantilla="88" etiqueta="Personas en la cabina, apagado" />
            </dd>
          </div>
          <div>
            <dt>Fila</dt>
            <dd>
              <Display7 plantilla="888" etiqueta="Personas en la fila, apagado" />
            </dd>
          </div>
          <div>
            <dt>Rechazos</dt>
            <dd>
              <Display7 plantilla="888" etiqueta="Rechazos, apagado" />
            </dd>
          </div>
        </dl>

        <svg
          className="pozo"
          viewBox="0 0 260 580"
          role="img"
          aria-label="Dibujo del pozo del ascensor con las paradas del sótano (S) y de P1 a P9. La cabina está en P1."
        >
          <rect x="96" y="14" width="76" height="546" fill="none" stroke="#3E7C82" strokeWidth="2" />
          {PISOS.map((nombre, i) => {
            const y = Y_BASE - i * ALTO_PISO;
            return (
              <g key={nombre}>
                <line x1="72" x2="196" y1={y + 28} y2={y + 28} stroke="#4A5159" strokeWidth="1" />
                <text x="62" y={y + 22} textAnchor="end" fill="#B9C0C6" fontSize="20" fontFamily="inherit">
                  {nombre}
                </text>
              </g>
            );
          })}
          <rect x="104" y={Y_CABINA} width="60" height="44" fill="#3E7C82" fillOpacity="0.28" stroke="#3E7C82" strokeWidth="2" />
          <line x1="134" x2="134" y1={Y_CABINA} y2={Y_CABINA + 44} stroke="#3E7C82" strokeWidth="1" />
        </svg>
      </div>
    </section>
  );
}
