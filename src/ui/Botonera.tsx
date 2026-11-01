import { useId, type ReactNode } from 'react';
import { CAMBIOS_DE_CLASE, formatoHora } from '../data/horario.ts';
import { CIFRAS, INICIO_MAX_MIN, INICIO_MIN_MIN, RANGOS } from '../data/rangos.ts';
import { tasaEsperadaPicos } from '../sim/llegadas.ts';
import type { Campo } from '../sim/validacion.ts';
import { useApp, type SeccionAyuda, type SeleccionHora } from '../store/app.ts';
import { Icono, type NombreIcono } from './Iconos.tsx';
import { Aviso, Llamada } from './Llamada.tsx';
import { coma } from './formato.ts';
import { idCampo, useErrorVisible, useExcesoVisible, useUltimaValida } from './validacionUi.ts';

function Mensaje({ id, texto, flotante = false }: { id: string; texto: string | undefined; flotante?: boolean }) {
  if (!texto) return null;
  return (
    <p id={id} className={flotante ? 'mensaje-error mensaje-flotante' : 'mensaje-error'} role={flotante ? 'alert' : undefined}>
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        <path d="M8 1.5 15 14H1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 6v4M8 11.6v.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>{texto}</span>
    </p>
  );
}

/** El «?» de cada sección: abre la parte de la Ayuda que le corresponde. */
export function MasAyuda({ seccion, de }: { seccion: SeccionAyuda; de: string }) {
  const abrir = useApp((s) => s.abrirAyuda);
  return (
    <button type="button" className="mas" aria-haspopup="dialog" aria-label={`Ayuda: ${de}`} onClick={() => abrir(seccion)}>
      <span aria-hidden="true">?</span>
    </button>
  );
}

function Paso({ numero, titulo, seccion, children }: { numero: number; titulo: string; seccion: SeccionAyuda; children: ReactNode }) {
  const id = `paso-${numero}`;
  return (
    <section className="tarjeta paso" aria-labelledby={id}>
      <header>
        <span className="numero" aria-hidden="true">
          {numero}
        </span>
        <h2 id={id}>{titulo}</h2>
        <MasAyuda seccion={seccion} de={titulo} />
      </header>
      {children}
    </section>
  );
}

interface CampoUiProps {
  icono: NombreIcono;
  etiqueta: string;
  ayuda: string;
  /** Id del control (el `for` de la etiqueta). */
  para: string;
  error: string | undefined;
  /** Número que pasa el máximo: sale apenas se escribe, flotando, para que nada se corra de lugar. */
  exceso?: string | undefined;
  /** Los íconos de silla de ruedas y muletas van más grandes para que se reconozcan. */
  iconoGrande?: boolean;
  children: ReactNode;
  extra?: ReactNode;
}

/** Un dato: ícono, nombre, una línea de ayuda con ejemplo y el control. */
function CampoUi({ icono, etiqueta, ayuda, para, error, exceso, iconoGrande, children, extra }: CampoUiProps) {
  return (
    <div className="campo">
      <Icono nombre={icono} grande={iconoGrande} />
      <div className="campo-nombre">
        <label htmlFor={para}>{etiqueta}</label>
        <p id={`${para}-ayuda`} className="ayuda-campo">
          {ayuda}
        </p>
      </div>
      <div className="campo-control">{children}</div>
      {extra}
      <Mensaje id={`${para}-error`} texto={error} />
      <Mensaje id={`${para}-error`} texto={error ? undefined : exceso} flotante />
    </div>
  );
}

const describedBy = (id: string, error: string | undefined) => (error ? `${id}-ayuda ${id}-error` : `${id}-ayuda`);

interface FilaConteoProps {
  campo: Extract<Campo, 'llegadasP1' | 'bajan' | 'sillas' | 'muletas' | 'usosAseo'>;
  etiqueta: string;
  ayuda: string;
  icono: NombreIcono;
  iconoGrande?: boolean;
}

/** Campo de texto entre dos botones − y +; el texto sigue siendo texto para validar coma, punto y letras. */
function FilaConteo({ campo, etiqueta, ayuda, icono, iconoGrande }: FilaConteoProps) {
  const valor = useApp((s) => s.texto[campo]);
  const poner = useApp((s) => s.poner);
  const error = useErrorVisible(campo);
  const exceso = useExcesoVisible(campo);
  const { min, max } = RANGOS[campo];
  const id = idCampo(campo);

  const mover = (delta: number) => {
    const actual = /^\d+$/.test(valor.trim()) ? Number(valor.trim()) : 0;
    poner(campo, String(Math.min(max, Math.max(min, actual + delta))));
  };

  return (
    <CampoUi icono={icono} iconoGrande={iconoGrande} etiqueta={etiqueta} ayuda={ayuda} para={id} error={error} exceso={exceso}>
      <div className="contador">
        <button type="button" className="boton-cuadrado" aria-label={`Restar uno: ${etiqueta}`} onClick={() => mover(-1)}>
          <span aria-hidden="true">−</span>
        </button>
        <input
          id={id}
          name={campo}
          className="campo-texto campo-numero"
          type="text"
          inputMode="numeric"
          maxLength={CIFRAS[campo]}
          autoComplete="off"
          spellCheck={false}
          value={valor}
          aria-invalid={error || exceso ? true : undefined}
          aria-describedby={describedBy(id, error ?? exceso)}
          onChange={(e) => poner(campo, e.target.value)}
        />
        <button type="button" className="boton-cuadrado" aria-label={`Sumar uno: ${etiqueta}`} onClick={() => mover(1)}>
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </CampoUi>
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
  const otra = seleccion === 'otra';
  const idLista = otra ? `${id}-lista` : id;


  return (
    <CampoUi
      icono="hora"
      etiqueta="Hora de inicio"
      ayuda="A qué hora empieza lo que quieres simular. Ej.: 12:40, cuando cambia una clase."
      para={idLista}
      error={error}
      extra={
        otra ? (
          <div className="hora-otra">
            <label htmlFor={id}>Hora en formato de 24 horas (HH:MM)</label>
            <input
              id={id}
              name="horaInicio"
              className="campo-texto campo-hora"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder="12:40"
              value={texto}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) => poner('horaInicio', e.target.value)}
            />
          </div>
        ) : null
      }
    >
      <select
        id={idLista}
        name="horaLista"
        className="campo-texto campo-lista"
        value={seleccion}
        aria-invalid={error && !otra ? true : undefined}
        aria-describedby={describedBy(idLista, error && !otra ? error : undefined)}
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
    </CampoUi>
  );
}

function FilaDuracion() {
  const valor = useApp((s) => s.texto.duracion);
  const poner = useApp((s) => s.poner);
  const error = useErrorVisible('duracion');
  const exceso = useExcesoVisible('duracion');
  const id = idCampo('duracion');
  return (
    <CampoUi icono="duracion" etiqueta="Duración" ayuda="Cuántos minutos dura la franja. Ej.: 50." para={id} error={error} exceso={exceso}>
      <div className="con-unidad">
        <input
          id={id}
          name="duracion"
          className="campo-texto campo-numero"
          type="text"
          inputMode="numeric"
          maxLength={CIFRAS.duracion}
          autoComplete="off"
          spellCheck={false}
          value={valor}
          aria-invalid={error || exceso ? true : undefined}
          aria-describedby={describedBy(id, error ?? exceso)}
          onChange={(e) => poner('duracion', e.target.value)}
        />
        <span className="unidad">min</span>
      </div>
    </CampoUi>
  );
}

/** «Llegan unas 2,4 personas por minuto; 3,7 en los picos»: explica el aviso de saturación y qué son los picos. */
function LecturaPrevia() {
  const { ultima, vigente } = useUltimaValida();
  if (!ultima) return null;
  const e = ultima.entradas;
  const franja = e.llegadasP1 / e.duracionMin;
  const picos = tasaEsperadaPicos(e);
  const texto =
    picos === null
      ? `Llegan unas ${coma(franja)} personas por minuto, parejas en toda la franja (no hay cambio de clase).`
      : `Llegan unas ${coma(franja)} personas por minuto; ${coma(picos)} en los picos (los 12,5 minutos antes y después de cada cambio de clase).`;
  return (
    <p className="lectura-previa" style={vigente ? undefined : { visibility: 'hidden' }}>
      {texto}
    </p>
  );
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
          className="boton"
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

/** Los cuatro pasos: cuándo, cuánta gente, casos especiales y simular. */
export function Botonera() {
  const cargar = useApp((s) => s.cargarMiercoles);
  return (
    <>
      <section className="tarjeta atajo" aria-label="Atajo">
        <p>
          <strong>¿No sabes qué poner?</strong> Carga el caso real del miércoles.
        </p>
        <button type="button" className="boton" onClick={cargar}>
          Cargar el caso del miércoles
        </button>
      </section>

      <Paso numero={1} titulo="¿Cuándo?" seccion="cuando">
        <FilaHora />
        <FilaDuracion />
      </Paso>

      <Paso numero={2} titulo="¿Cuánta gente?" seccion="gente">
        <FilaConteo
          campo="llegadasP1"
          icono="suben"
          etiqueta="Llegan a P1 para subir"
          ayuda="Personas que llegan a la planta baja y quieren subir. Ej.: 119 en 50 min el miércoles."
        />
        <FilaConteo campo="bajan" icono="bajan" etiqueta="Bajan" ayuda="Personas que bajan en el ascensor hacia P1, P2 o P3. Ej.: 19." />
      </Paso>

      <Paso numero={3} titulo="Casos especiales" seccion="especiales">
        <FilaConteo
          campo="sillas"
          icono="silla"
          iconoGrande
          etiqueta="Sillas de ruedas"
          ayuda="Ocupan 3 cupos y suben primero. Se cuentan entre las que llegan. Ej.: 0."
        />
        <FilaConteo
          campo="muletas"
          icono="muleta"
          iconoGrande
          etiqueta="Muletas"
          ayuda="Ocupan 2 cupos y suben primero. Se cuentan entre las que llegan. Ej.: 0."
        />
        <FilaConteo
          campo="usosAseo"
          icono="aseo"
          etiqueta="Usos del aseo"
          ayuda="Veces que el personal de aseo usa el ascensor con su carrito; lo deja ocupado 2 min 30 s. Ej.: 1."
        />
      </Paso>

      <Paso numero={4} titulo="Simular" seccion="simular">
        <LecturaPrevia />
        <Aviso />
        <p className="que-pasa">Se simula 10 veces la misma franja y se promedia.</p>
        <Llamada />
        <Avanzado />
      </Paso>
    </>
  );
}
