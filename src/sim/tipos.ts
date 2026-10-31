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

/** Lo que la escena necesita saber de cada persona de la corrida animada (la de aseo lleva id −1). */
export interface PersonaTraza {
  id: number;
  tipo: TipoPersona;
  cupos: number;
  origen: number;
  destino: number;
  /** Segundo (desde el inicio de la franja) en que llega y se pone en la fila. */
  llegada: number;
}

/**
 * Hechos de la corrida, con su segundo simulado (desde el inicio de la franja), en el orden en que ocurren.
 * La escena calcula con ellos el estado en cualquier segundo.
 */
export type EventoTraza =
  /** La cabina sale del piso `desde` hacia `hacia` y llega en `llega` (5 s por piso). */
  | { t: number; tipo: 'mueve'; desde: number; hacia: number; llega: number }
  /** Empieza a abrir las puertas (quedan abiertas del todo 3,3 s después). */
  | { t: number; tipo: 'abre'; piso: number }
  | { t: number; tipo: 'abierta'; piso: number }
  /** Empieza a cerrar (quedan cerradas 4,3 s después). */
  | { t: number; tipo: 'cierra'; piso: number }
  | { t: number; tipo: 'cerrada'; piso: number }
  /** La persona entra a la cabina. Con las puertas abiertas se entra y se sale de a una, 2 s cada una. */
  | { t: number; tipo: 'sube'; persona: number; piso: number }
  | { t: number; tipo: 'baja'; persona: number; piso: number }
  /** Quien no cupo en P1 se va por las escaleras (al empezar a cerrar las puertas). */
  | { t: number; tipo: 'escaleras'; persona: number }
  /** El aseo termina en el sótano y su personal se va. */
  | { t: number; tipo: 'aseoTermina' };

export interface Traza {
  personas: PersonaTraza[];
  eventos: EventoTraza[];
  /** Segundo en que termina la corrida (después de la franja se sigue hasta atender a todos). */
  finS: number;
}

export function crearTraza(): Traza {
  return { personas: [], eventos: [], finS: 0 };
}
