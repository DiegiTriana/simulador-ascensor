import type { Fase } from '../store/app.ts';

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
      return `Simulando, ${progreso?.hechas ?? 0} de ${progreso?.total ?? 10}`;
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

/** Plantilla de segmentos apagados con al menos `minimo` cifras: «23» con minimo 3 da «888»; «8,8» da «88,8». */
export function plantillaDe(texto: string, minimo: number): string {
  const forma = texto.replace(/\d/g, '8');
  const cifras = (forma.match(/8/g) ?? []).length;
  return '8'.repeat(Math.max(0, minimo - cifras)) + forma;
}
