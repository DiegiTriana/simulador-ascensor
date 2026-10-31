// Cuentas de la barra de tiempo de la corrida.

/**
 * Dónde cae el fin de la franja en la barra (de 0 a 1), o null si no hay nada que marcar: la franja es de cero
 * minutos o la corrida termina antes o justo cuando ella.
 */
export function fraccionDeFranja(franjaS: number, finS: number): number | null {
  if (!(franjaS > 0) || !(finS > franjaS)) return null;
  return franjaS / finS;
}

/** ¿El reloj ya pasó el fin de la franja (y todavía hay corrida por ver)? */
export function pasoLaFranja(t: number, franjaS: number, finS: number): boolean {
  return fraccionDeFranja(franjaS, finS) !== null && t >= franjaS;
}

/** Minutos y segundos, como se lee en la barra: 3:05, 50:00. */
export function minutosYSegundos(s: number): string {
  const total = Math.max(0, Math.floor(s));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export const FRASE_FIN_DE_FRANJA = 'Terminó la franja; el ascensor atiende a quien quedó en la fila.';
