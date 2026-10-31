// Modelos 3D de la escena (fase 4). Son del paquete Mini Characters de Kenney (CC0), preparados con
// `npm run modelos` en public/modelos/. La escena es de estilo caricatura: sus medidas están en
// «metros de escena» y no coinciden con las del edificio real.

/** Altura de pie de todas las personas, en metros de escena (una persona real mediría 1,7 m). */
export const ALTURA_PERSONA = 1.2;

/** Los 6 modelos de estudiante. */
export const ESTUDIANTES = [
  'character-female-b',
  'character-female-c',
  'character-female-f',
  'character-male-a',
  'character-male-b',
  'character-male-f',
] as const;
export type ModeloEstudiante = (typeof ESTUDIANTES)[number];

/** Personaje del aseo: solo sale con el carrito, que se dibuja en código. */
export const MODELO_ASEO = 'character-male-e';
export const MODELO_SILLA = 'wheelchair';
/** Una muleta; quien usa muletas lleva dos. */
export const MODELO_MULETA = 'aid-crutch';

export const CLIPS_SILLA = [
  'wheelchair-sit',
  'wheelchair-move-forward',
  'wheelchair-move-back',
  'wheelchair-move-left',
  'wheelchair-move-right',
  'wheelchair-look-left',
  'wheelchair-look-right',
] as const;
/** Quieto, caminar, con las dos manos al frente (muletas) y los clips de la silla de ruedas. */
export const CLIPS_ESTUDIANTE = ['idle', 'walk', 'holding-both', ...CLIPS_SILLA] as const;
/** Quieto, caminar y con las dos manos al frente (empujar el carrito). */
export const CLIPS_ASEO = ['idle', 'walk', 'holding-both'] as const;

/** Archivos que debe haber en public/modelos/ (la textura colormap.png la comparten todos). */
export const ARCHIVOS_MODELOS = [...ESTUDIANTES, MODELO_ASEO, MODELO_SILLA, MODELO_MULETA].map((n) => `${n}.glb`);
export const TEXTURA_MODELOS = 'colormap.png';

/** Los estudiantes se eligen por el número de la persona, nunca con el generador de la simulación. */
export function estudiantePorNumero(numero: number): ModeloEstudiante {
  if (!Number.isInteger(numero) || numero < 0) throw new RangeError(`Número de persona inválido: ${numero}`);
  return ESTUDIANTES[numero % ESTUDIANTES.length];
}

/** Cabina dibujada más grande que la real (1,4 m de ancho) para que quepan 10 personas de pie. Medidas interiores. */
export const CABINA_DIBUJADA = { ancho: 4.2, fondo: 3.4, alto: 1.9 } as const;
/** Cupos de la cabina (capacidad 10 de la simulación). */
export const CAPACIDAD_CABINA = 10;
