import { useMemo } from 'react';
import { useApp } from '../store/app.ts';
import { validar, type Campo, type ResultadoValidacion } from '../sim/validacion.ts';

/** Validación de lo que hay escrito ahora (el texto cambia poco, así que se recalcula solo entonces). */
export function useValidacion(): ResultadoValidacion {
  const texto = useApp((s) => s.texto);
  return useMemo(() => validar(texto), [texto]);
}

/** El mensaje de un campo, solo después de pulsar Simular: si salieran al dejar el campo, correrían el botón justo cuando se lo pulsa. */
export function useErrorVisible(campo: Campo): string | undefined {
  const v = useValidacion();
  const mostrar = useApp((s) => s.intento);
  const sinElegirHora = useApp((s) => campo === 'horaInicio' && s.horaSeleccion === '');
  if (v.ok || !mostrar) return undefined;
  const mensaje = v.errores[campo];
  if (mensaje && sinElegirHora) return 'Elige la hora de inicio en la lista, o «Otra hora» para escribirla.';
  return mensaje;
}

export const idCampo = (campo: Campo) => `campo-${campo}`;
