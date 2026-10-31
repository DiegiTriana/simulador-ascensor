import type { Fase } from '../store/app.ts';

/** «Corrida 3 de 10»: la que está corriendo (las hechas más una, sin pasar del total). */
export function textoCorrida(progreso: { hechas: number; total: number } | null): string {
  const total = progreso?.total ?? 10;
  return `Corrida ${Math.min((progreso?.hechas ?? 0) + 1, total)} de ${total}`;
}

/** El texto de estado de la simulación. El nombre de cada paso se conserva en todo el flujo. */
export function textoEstado(
  fase: Fase,
  progreso: { hechas: number; total: number } | null,
  mensajeError: string | null,
  hayCamposPorCorregir: boolean,
): string {
  // Corregir los campos pasa por delante de cualquier otro estado, salvo mientras corre la simulación.
  if (hayCamposPorCorregir && fase !== 'simulando') return 'Revisa los campos marcados.';
  switch (fase) {
    case 'simulando':
      return textoCorrida(progreso);
    case 'listo':
      return 'Simulación lista';
    case 'cancelado':
      return 'Simulación cancelada';
    case 'error':
      return `No se pudo simular: ${mensajeError ?? 'error desconocido'}. Pulsa Simular para intentarlo otra vez.`;
    default:
      return '';
  }
}

