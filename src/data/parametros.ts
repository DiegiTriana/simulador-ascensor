// Parámetros fijos. Cada número sale del PDF de datos y del docx (ver CLAUDE.md).

export const PARAMETROS = {
  capacidad: 10,
  K: 11,
  /** Pisos como números: 0 = sótano (S), 1..9 = P1..P9. */
  pisoSotano: 0,
  pisoMaximo: 9,
  /** Destinos de quienes suben desde P1 (149 personas en los 3 días). */
  destinosSubida: [
    { piso: 4, peso: 15 },
    { piso: 5, peso: 25 },
    { piso: 6, peso: 36 },
    { piso: 7, peso: 18 },
    { piso: 8, peso: 6 },
  ],
  /** Pisos de origen de quienes bajan tras el cambio de clase (19 el miércoles). */
  origenesBajada: [
    { piso: 4, peso: 1 },
    { piso: 5, peso: 1 },
    { piso: 6, peso: 9 },
    { piso: 7, peso: 6 },
    { piso: 8, peso: 2 },
  ],
  /** Destinos de quienes bajan: P1 80 %, P2 10 %, P3 10 %. */
  destinosBajada: [
    { piso: 1, peso: 80 },
    { piso: 2, peso: 10 },
    { piso: 3, peso: 10 },
  ],
  probEscaleras: 0.85,
  cuposSilla: 3,
  cuposMuletas: 2,
  /** Tiempos del ascensor en segundos (ajustados al miércoles en el prototipo). */
  tiempos: {
    porPiso: 5,
    abrir: 3.3,
    cerrar: 4.3,
    minAbierta: 6.3,
    porPersona: 2,
    aseo: 150,
  },
  /** Parte de las llegadas que cae en los picos (92 de 104 el miércoles). */
  fraccionEnPicos: 0.88,
  /** Duración de cada pico: 12,5 min junto a un cambio de clase. */
  picoSegundos: 750,
  /**
   * Personas que ya esperaban a las 12:40 (15 de 119 el miércoles), cuando la
   * franja empieza justo en un cambio de clase. Se escala con las llegadas.
   */
  esperabanAlInicio: { de: 119, esperaban: 15 },
} as const;
