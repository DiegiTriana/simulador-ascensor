// Rangos válidos de las 7 entradas (propuestos por mí y aprobados por el usuario; no vienen de los documentos).

import { CAMBIOS_DE_CLASE } from './horario.ts';

/** Primera hora que se acepta: el primer cambio de clase del horario (06:00). */
export const INICIO_MIN_MIN = CAMBIOS_DE_CLASE[0];
/** Fin del último bloque (22:05). La franja no puede pasar de aquí. */
export const FIN_MAX_MIN = CAMBIOS_DE_CLASE[CAMBIOS_DE_CLASE.length - 1];
/** Última hora de inicio que se acepta (22:04, para que quepa al menos 1 min). */
export const INICIO_MAX_MIN = FIN_MAX_MIN - 1;

export const RANGOS = {
  duracionMin: { min: 1, max: 960 },
  llegadasP1: { min: 0, max: 3000 },
  bajan: { min: 0, max: 1000 },
  sillas: { min: 0, max: 20 },
  muletas: { min: 0, max: 50 },
  usosAseo: { min: 0, max: 50 },
} as const;

/**
 * μ medida en la simulación (personas por minuto que suben en las vueltas saturadas, fase 1:
 * 3,53 en el caso del miércoles). Solo se usa para el aviso de saturación.
 */
export const MU_AVISO_POR_MIN = 3.5;
