import { useRef } from 'react';
import { useApp } from '../store/app.ts';
import { textoEstado } from './estado.ts';
import { idCampo, useValidacion } from './validacionUi.ts';

/** Aviso de saturación: no bloquea nada, solo cuenta lo que va a pasar. */
export function Aviso() {
  const v = useValidacion();
  const aviso = v.ok ? v.avisos[0] : undefined;
  if (!aviso) return null;
  return (
    <p className="aviso">
      <span className="aviso-icono" aria-hidden="true">
        !
      </span>
      <span>{aviso}</span>
    </p>
  );
}

/** Diez círculos, uno por corrida: los hechos llenos y el que corre ahora con aro. Es decoración; el texto dice lo mismo. */
function Puntos({ hechas, corriendo, total = 10 }: { hechas: number; corriendo: boolean; total?: number }) {
  return (
    <span className="puntos" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < hechas ? 'punto hecho' : corriendo && i === hechas ? 'punto ahora' : 'punto'} />
      ))}
    </span>
  );
}

/** Simular, Cancelar y el estado. En celular queda fijo abajo mientras se recorre el panel. */
export function Llamada() {
  const fase = useApp((s) => s.fase);
  const progreso = useApp((s) => s.progreso);
  const resultado = useApp((s) => s.resultado);
  const obsoleto = useApp((s) => s.obsoleto);
  const mensajeError = useApp((s) => s.mensajeError);
  const intento = useApp((s) => s.intento);
  const simular = useApp((s) => s.simular);
  const cancelar = useApp((s) => s.cancelar);
  const v = useValidacion();
  const botonSimular = useRef<HTMLButtonElement>(null);

  const corriendo = fase === 'simulando';
  const error = fase === 'error';
  const porCorregir = intento && !v.ok;
  const texto =
    textoEstado(fase, progreso, mensajeError, porCorregir) ||
    (obsoleto ? 'Cambiaste los datos. Pulsa Simular.' : resultado ? 'Simulación lista' : 'Sin simular todavía');
  const hechas = corriendo || (fase === 'listo' && !obsoleto) ? (progreso?.hechas ?? 0) : 0;

  const alSimular = () => {
    if (corriendo) return;
    const campo = simular();
    if (campo) document.getElementById(idCampo(campo))?.focus();
  };

  return (
    <div className="llamada">
      <button ref={botonSimular} type="button" className="boton boton-simular" aria-disabled={corriendo} onClick={alSimular}>
        Simular
      </button>
      {corriendo && (
        <button
          type="button"
          className="boton"
          onClick={() => {
            cancelar();
            botonSimular.current?.focus();
          }}
        >
          Cancelar
        </button>
      )}
      <div className="progreso">
        <p role="status" className={error ? 'estado-texto estado-error' : 'estado-texto'}>
          {texto}
        </p>
        <Puntos hechas={hechas} corriendo={corriendo} />
      </div>
    </div>
  );
}
