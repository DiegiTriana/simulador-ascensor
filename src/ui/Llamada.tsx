import { useRef } from 'react';
import { useApp } from '../store/app.ts';
import { Lamparas } from './Lamparas.tsx';
import { textoEstado } from './estado.ts';
import { idCampo, useValidacion } from './validacionUi.ts';

/** Aviso de saturación: una lámpara de aviso que no bloquea nada. */
export function Aviso() {
  const v = useValidacion();
  const aviso = v.ok ? v.avisos[0] : undefined;
  if (!aviso) return null;
  return (
    <p className="aviso">
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
        <path d="M8 1.5 15 14H1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8 6v4M8 11.6v.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>{aviso}</span>
    </p>
  );
}

/** El botón de llamada. En celular queda fijo abajo mientras se recorre el panel. */
export function Llamada() {
  const fase = useApp((s) => s.fase);
  const progreso = useApp((s) => s.progreso);
  const mensajeError = useApp((s) => s.mensajeError);
  const intento = useApp((s) => s.intento);
  const simular = useApp((s) => s.simular);
  const cancelar = useApp((s) => s.cancelar);
  const v = useValidacion();
  const botonSimular = useRef<HTMLButtonElement>(null);

  const corriendo = fase === 'simulando';
  const texto = textoEstado(fase, progreso, mensajeError, intento && !v.ok);

  const alSimular = () => {
    if (corriendo) return;
    const campo = simular();
    if (campo) document.getElementById(idCampo(campo))?.focus();
  };

  return (
    <div className="llamada">
      <div className="llamada-fila">
        <span className={corriendo ? 'aro encendido' : 'aro'}>
          <button ref={botonSimular} type="button" className="boton-llamada" aria-disabled={corriendo} onClick={alSimular}>
            Simular
          </button>
        </span>
        <div className="llamada-estado">
          <p className="estado-texto" aria-hidden="true">
            {texto}
          </p>
          <span className="llamada-lamparas">
            <Lamparas encendidas={progreso?.hechas ?? 0} chicas />
          </span>
        </div>
        {corriendo && (
          <button
            type="button"
            className="plano"
            onClick={() => {
              cancelar();
              botonSimular.current?.focus();
            }}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
