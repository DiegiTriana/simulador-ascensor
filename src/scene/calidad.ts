// Calidad adaptable de la escena: si los cuadros por segundo bajan, se apagan las sombras y después se baja la
// resolución. Solo baja (no sube otra vez) para que la escena no parpadee entre un nivel y otro. El medidor es una
// función pura de los tiempos de cada cuadro, para probarla sin dibujar nada.

export interface NivelDeCalidad {
  /** La luz del sol proyecta sombras. */
  sombras: boolean;
  /** Tope de la resolución (píxeles del lienzo por píxel de pantalla). */
  dprMax: number;
}

export const NIVELES: readonly NivelDeCalidad[] = [
  { sombras: true, dprMax: 2 },
  { sombras: false, dprMax: 2 },
  { sombras: false, dprMax: 1 },
  { sombras: false, dprMax: 0.75 },
];
export const NIVEL_MAXIMO = NIVELES.length - 1;

/** Por debajo de estos cuadros por segundo, sostenidos, se baja un nivel. */
export const FPS_MINIMOS = 30;
/** Una ventana de medida dura esto (segundos de cuadros seguidos). */
export const VENTANA_S = 2;
/** Ventanas bajas seguidas que hacen falta para bajar. */
export const VENTANAS_BAJAS = 2;
/** Los primeros segundos no cuentan: se cargan modelos y se compilan los materiales. */
export const CALENTAMIENTO_S = 3;
/** Un cuadro más largo que esto es una pausa (pestaña oculta, escena quieta), no lentitud: reinicia la ventana. */
export const PAUSA_S = 0.25;

export interface Medidor {
  /** Anota un cuadro que tardó `dt` segundos. Devuelve true cuando conviene bajar un nivel. */
  cuadro(dt: number): boolean;
  /** Olvida lo medido (al cambiar de nivel). */
  reiniciar(): void;
}

export function crearMedidor(): Medidor {
  let calentado = 0;
  let cuadros = 0;
  let tiempo = 0;
  let bajas = 0;
  const vaciarVentana = () => {
    cuadros = 0;
    tiempo = 0;
  };
  return {
    cuadro(dt) {
      if (!(dt > 0)) return false;
      if (dt > PAUSA_S) {
        vaciarVentana();
        bajas = 0;
        return false;
      }
      if (calentado < CALENTAMIENTO_S) {
        calentado += dt;
        return false;
      }
      cuadros++;
      tiempo += dt;
      if (tiempo < VENTANA_S) return false;
      const fps = cuadros / tiempo;
      vaciarVentana();
      bajas = fps < FPS_MINIMOS ? bajas + 1 : 0;
      if (bajas < VENTANAS_BAJAS) return false;
      bajas = 0;
      return true;
    },
    reiniciar() {
      vaciarVentana();
      bajas = 0;
      calentado = 0;
    },
  };
}

/** Nivel inicial: 0, o el que pida ?calidad=N (solo en desarrollo, para revisar cada nivel). */
export function nivelInicial(busqueda: string, desarrollo: boolean): number {
  if (!desarrollo) return 0;
  const n = Number(new URLSearchParams(busqueda).get('calidad'));
  return Number.isInteger(n) && n >= 0 && n <= NIVEL_MAXIMO ? n : 0;
}
