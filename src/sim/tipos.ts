export type TipoPersona = 'normal' | 'silla' | 'muletas' | 'aseo';

/** Pisos: 0 = sótano (S), 1..9 = P1..P9. */
export interface Persona {
  id: number;
  tipo: TipoPersona;
  cupos: number;
  origen: number;
  destino: number;
  /** Segundo (entero) en que llega y se pone en la fila. */
  llegada: number;
  /** Ya esperaba al comenzar la franja. */
  inicial: boolean;
  /** Llegó dentro de un pico (o ya esperaba al inicio). */
  enPico: boolean;
  /** Segundo en que entró a la cabina. */
  abordo: number | null;
  /** Segundo en que salió de la cabina en su destino. */
  bajo: number | null;
  seFue: boolean;
}

export interface Entradas {
  /** Minutos desde la medianoche (12:40 = 760). */
  horaInicioMin: number;
  duracionMin: number;
  /** Personas que llegan a P1 para subir, incluidas sillas, muletas y las que ya esperaban. */
  llegadasP1: number;
  bajan: number;
  sillas: number;
  muletas: number;
  usosAseo: number;
}

export interface Escenario {
  duracionS: number;
  /** Ordenadas por llegada. */
  personas: Persona[];
  solicitudesAseo: number[];
  /** Ventanas de pico en segundos desde el inicio de la franja. */
  ventanasPico: [number, number][];
}

export interface Vuelta {
  /** Segundo en que se abren las puertas en P1. */
  t: number;
  aseo: boolean;
  esperando: number;
  suben: number;
  quedanAfuera: number;
  rechazos: number;
  /** Segundos hasta la siguiente apertura en P1; null en la última. */
  duracion: number | null;
}

export interface Resultado {
  semilla: number;
  llegadas: number;
  abordaron: number;
  abandonos: number;
  /** Abandonos sobre todas las llegadas, en %. */
  abandonoPct: number;
  pico: {
    segundos: number;
    llegadas: number;
    llegadasEnVentana: number;
    abandonos: number;
    abandonoPct: number | null;
    /** Personas por minuto que llegan dentro de los picos (sin las que ya esperaban). */
    lambdaPorMin: number | null;
    /** Promedio de personas en la fila de P1 durante los picos. */
    Lq: number | null;
    /** Fila de P1 más quienes viajan desde P1, en promedio, durante los picos. */
    L: number | null;
  };
  /** Mismos promedios sobre toda la franja. */
  Lq: number;
  L: number;
  /** μ medida: personas que suben por minuto en las vueltas saturadas. */
  muPorMin: number | null;
  /** Segundos promedio de espera hasta entrar a la cabina (quienes subieron). */
  Wq: number | null;
  /** Segundos promedio desde que llegan hasta que bajan en su piso. */
  W: number | null;
  filaMaxima: number;
  bajan: { total: number; atendidos: number; esperaPromedio: number | null };
  aseoAtendidos: number;
  vueltas: Vuelta[];
}
