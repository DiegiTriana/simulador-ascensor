import { useId } from 'react';
import { CAMBIOS_DE_CLASE, formatoHora } from '../data/horario.ts';
import { INICIO_MAX_MIN, INICIO_MIN_MIN, RANGOS } from '../data/rangos.ts';
import { tasaEsperadaPicos } from '../sim/llegadas.ts';
import { leerHora, type Campo } from '../sim/validacion.ts';
import { useApp, type SeleccionHora } from '../store/app.ts';
import { Display7 } from './Display7.tsx';
import { coma } from './formato.ts';
import { idCampo, useErrorVisible, useValidacion } from './validacionUi.ts';

function Mensaje({ id, texto }: { id: string; texto: string | undefined }) {
  if (!texto) return null;
  return (
    <p id={id} className="mensaje-error">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        <path d="M8 1.5 15 14H1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 6v4M8 11.6v.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>{texto}</span>
    </p>
  );
}

interface FilaConteoProps {
  campo: Extract<Campo, 'llegadasP1' | 'bajan' | 'sillas' | 'muletas' | 'usosAseo'>;
  etiqueta: string;
}

/** Fila de panel: nombre a la izquierda; a la derecha, campo de texto entre dos botones de llamada. */
function FilaConteo({ campo, etiqueta }: FilaConteoProps) {
  const valor = useApp((s) => s.texto[campo]);
  const poner = useApp((s) => s.poner);
  const error = useErrorVisible(campo);
  const { min, max } = RANGOS[campo];
  const id = idCampo(campo);
  const idError = `${id}-error`;

  const mover = (delta: number) => {
    const actual = /^\d+$/.test(valor.trim()) ? Number(valor.trim()) : 0;
    poner(campo, String(Math.min(max, Math.max(min, actual + delta))));
  };

  return (
    <div className="fila fila-conteo">
      <label htmlFor={id}>{etiqueta}</label>
      <button type="button" className="redondo" aria-label={`Restar uno: ${etiqueta}`} onClick={() => mover(-1)}>
        <span aria-hidden="true">−</span>
      </button>
      <input
        id={id}
        name={campo}
        className="campo campo-numero"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={valor}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        onChange={(e) => poner(campo, e.target.value)}
      />
      <button type="button" className="redondo" aria-label={`Sumar uno: ${etiqueta}`} onClick={() => mover(1)}>
        <span aria-hidden="true">+</span>
      </button>
      <Mensaje id={idError} texto={error} />
    </div>
  );
}

const OPCIONES_HORA = CAMBIOS_DE_CLASE.filter((m) => m >= INICIO_MIN_MIN && m <= INICIO_MAX_MIN);

function FilaHora() {
  const seleccion = useApp((s) => s.horaSeleccion);
  const texto = useApp((s) => s.texto.horaInicio);
  const ponerHora = useApp((s) => s.ponerHora);
  const poner = useApp((s) => s.poner);
  const error = useErrorVisible('horaInicio');
  const id = idCampo('horaInicio');
  const idError = `${id}-error`;

  const leida = leerHora(texto);
  const enRango = 'minutos' in leida && leida.minutos >= INICIO_MIN_MIN && leida.minutos <= INICIO_MAX_MIN;
  const reloj = enRango ? formatoHora(leida.minutos) : undefined;
  const otra = seleccion === 'otra';

  return (
    <div className="fila fila-hora">
      <label htmlFor={otra ? `${id}-lista` : id}>Hora de inicio</label>
      <select
        id={otra ? `${id}-lista` : id}
        name="horaLista"
        className="campo campo-lista"
        value={seleccion}
        aria-invalid={error && !otra ? true : undefined}
        aria-describedby={error ? idError : undefined}
        onChange={(e) => ponerHora(e.target.value as SeleccionHora)}
      >
        <option value="">Elige la hora</option>
        {OPCIONES_HORA.map((m) => (
          <option key={m} value={m}>
            {formatoHora(m)}
          </option>
        ))}
        <option value="otra">Otra hora</option>
      </select>
      <Display7 texto={reloj} plantilla="88:88" etiqueta={reloj ? `Hora de inicio: ${reloj}` : 'Hora de inicio sin elegir'} />
      {otra && (
        <div className="fila-hora-otra">
          <label htmlFor={id}>Hora en formato de 24 horas (HH:MM)</label>
          <input
            id={id}
            name="horaInicio"
            className="campo campo-texto-hora"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder="12:40"
            value={texto}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idError : undefined}
            onChange={(e) => poner('horaInicio', e.target.value)}
          />
        </div>
      )}
      <Mensaje id={idError} texto={error} />
    </div>
  );
}

function FilaDuracion() {
  const valor = useApp((s) => s.texto.duracion);
  const poner = useApp((s) => s.poner);
  const error = useErrorVisible('duracion');
  const id = idCampo('duracion');
  const idError = `${id}-error`;
  return (
    <div className="fila fila-duracion">
      <label htmlFor={id}>Duración</label>
      <input
        id={id}
        name="duracion"
        className="campo campo-numero"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={valor}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        onChange={(e) => poner('duracion', e.target.value)}
      />
      <span className="unidad">min</span>
      <Mensaje id={idError} texto={error} />
    </div>
  );
}

/** «Llegan unas 2,4 personas por minuto; 3,7 en los picos»: explica el aviso de saturación. */
function LecturaPrevia() {
  const v = useValidacion();
  if (!v.ok) return null;
  const e = v.entradas;
  const franja = e.llegadasP1 / e.duracionMin;
  const picos = tasaEsperadaPicos(e);
  const texto =
    picos === null
      ? `Llegan unas ${coma(franja)} personas por minuto, parejas en toda la franja (no hay cambio de clase).`
      : `Llegan unas ${coma(franja)} personas por minuto; ${coma(picos)} en los picos.`;
  return <p className="lectura-previa">{texto}</p>;
}

function Avanzado() {
  const semilla = useApp((s) => s.semilla);
  const otraMuestra = useApp((s) => s.otraMuestra);
  const fase = useApp((s) => s.fase);
  const idAyuda = useId();
  return (
    <details className="avanzado">
      <summary>Avanzado</summary>
      <div className="avanzado-cuerpo">
        <p id={idAyuda}>
          Semilla de la muestra: <strong className="semilla">{semilla}</strong>. Con los mismos datos y la misma semilla sale siempre el mismo resultado.
        </p>
        <button
          type="button"
          className="plano"
          aria-describedby={idAyuda}
          disabled={fase === 'simulando'}
          onClick={() => {
            const campo = otraMuestra();
            if (campo) document.getElementById(idCampo(campo))?.focus();
          }}
        >
          Otra muestra aleatoria
        </button>
      </div>
    </details>
  );
}

export function Botonera() {
  const cargar = useApp((s) => s.cargarMiercoles);
  return (
    <section className="placa" aria-labelledby="titulo-datos">
      <h2 id="titulo-datos" className="sr-only">
        Datos de la simulación
      </h2>
      <FilaHora />
      <FilaDuracion />
      <FilaConteo campo="llegadasP1" etiqueta="Personas que llegan a P1 para subir" />
      <FilaConteo campo="bajan" etiqueta="Personas que bajan" />
      <FilaConteo campo="sillas" etiqueta="Personas en silla de ruedas" />
      <FilaConteo campo="muletas" etiqueta="Personas con muletas" />
      <FilaConteo campo="usosAseo" etiqueta="Veces que el aseo usa el ascensor" />
      <LecturaPrevia />
      <button type="button" className="plano plano-ancho" onClick={cargar}>
        Cargar el caso del miércoles
      </button>
      <Avanzado />
    </section>
  );
}
