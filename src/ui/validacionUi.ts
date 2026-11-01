import { useMemo, useRef } from 'react';
import { useApp } from '../store/app.ts';
import { excedeElMaximo, validar, type Campo, type ResultadoValidacion } from '../sim/validacion.ts';

/** Validación de lo que hay escrito ahora (el texto cambia poco, así que se recalcula solo entonces). */
export function useValidacion(): ResultadoValidacion {
  const texto = useApp((s) => s.texto);
  return useMemo(() => validar(texto), [texto]);
}

/**
 * La última validación correcta y si sigue vigente. La lectura previa y el aviso de saturación se dibujan siempre con
 * ella: cuando lo escrito deja de ser válido se quedan en su lugar, invisibles, y así el botón Simular no sube ni baja
 * al aparecer o desaparecer un mensaje.
 */
export function useUltimaValida(): { ultima: Extract<ResultadoValidacion, { ok: true }> | null; vigente: boolean } {
  const v = useValidacion();
  const guardada = useRef<Extract<ResultadoValidacion, { ok: true }> | null>(null);
  if (v.ok) guardada.current = v;
  return { ultima: guardada.current, vigente: v.ok };
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

/**
 * El mensaje de un número que pasa el máximo, apenas se escribe y sin esperar a Simular. Se dibuja flotando sobre lo
 * que sigue (ver `.mensaje-flotante`), así nada se corre de lugar y el botón Simular no se mueve. Al pulsar Simular
 * pasa a ser el mensaje de siempre.
 */
export function useExcesoVisible(campo: Campo): string | undefined {
  const v = useValidacion();
  const mostrar = useApp((s) => s.intento);
  const texto = useApp((s) => s.texto[campo]);
  if (v.ok || mostrar) return undefined;
  const mensaje = v.errores[campo];
  return excedeElMaximo(campo, texto, mensaje) ? mensaje : undefined;
}

export const idCampo = (campo: Campo) => `campo-${campo}`;
