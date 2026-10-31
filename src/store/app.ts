// Estado de la aplicación (un solo dueño). El cliente del worker vive aquí; la interfaz solo lee y pide.
// Cambiar las entradas, cancelar o simular de nuevo sube la generación del cliente, así que lo que
// llegue tarde del worker se descarta.

import { create } from 'zustand';
import { CASO_MIERCOLES } from '../data/casos.ts';
import { formatoHora } from '../data/horario.ts';
import type { Comparacion } from '../sim/corridas.ts';
import { otraSemilla, SEMILLA_DEFECTO } from '../sim/semilla.ts';
import type { Entradas } from '../sim/tipos.ts';
import { validar, type Campo, type EntradasTexto } from '../sim/validacion.ts';
import { CORRIDAS_DEFECTO } from '../worker/protocolo.ts';
import { ClienteSim, crearWorkerReal, type WorkerMinimo } from '../worker/cliente.ts';

/** Campos en el orden en que aparecen en la botonera. */
export const CAMPOS: readonly Campo[] = ['horaInicio', 'duracion', 'llegadasP1', 'bajan', 'sillas', 'muletas', 'usosAseo'];

export type Fase = 'inactivo' | 'simulando' | 'listo' | 'cancelado' | 'error';

/** Lo que se elige en la lista de la hora: '' (nada), los minutos como texto, u 'otra'. */
export type SeleccionHora = '' | 'otra' | `${number}`;

/** Qué parte de la Ayuda abre cada «?»: 'general' abre la hoja desde el principio. */
export type SeccionAyuda = 'general' | 'cuando' | 'gente' | 'especiales' | 'simular' | 'resultados';

export interface Resultado {
  id: number;
  /** Las entradas con las que se simuló. */
  entradas: Entradas;
  comparacion: Comparacion;
}

interface Estado {
  texto: EntradasTexto;
  horaSeleccion: SeleccionHora;
  /** Ya pulsó Simular: desde ahí se muestran los mensajes de los campos (antes no, para que no se muevan los botones al pulsar). */
  intento: boolean;
  semilla: number;
  fase: Fase;
  progreso: { hechas: number; total: number } | null;
  resultado: Resultado | null;
  /** Las entradas cambiaron después de simular. */
  obsoleto: boolean;
  mensajeError: string | null;
  /** La hoja de Ayuda: null si está cerrada; si no, la sección a la que hay que llevar al lector. */
  ayuda: SeccionAyuda | null;

  poner(campo: Campo, valor: string): void;
  ponerHora(seleccion: SeleccionHora): void;
  cargarMiercoles(): void;
  /** Devuelve el primer campo con error (para llevar el foco), o null si empezó a simular. */
  simular(): Campo | null;
  cancelar(): void;
  otraMuestra(): Campo | null;
  abrirAyuda(seccion: SeccionAyuda): void;
  cerrarAyuda(): void;
}

const TEXTO_VACIO: EntradasTexto = {
  horaInicio: '',
  duracion: '',
  llegadasP1: '',
  bajan: '',
  sillas: '',
  muletas: '',
  usosAseo: '',
};

let cliente: ClienteSim | null = null;
let fabrica: () => WorkerMinimo = crearWorkerReal;
let idResultado = 0;
/** Las entradas de la simulación que corre ahora (el worker solo devuelve el resultado). */
let entradasEnCurso: Entradas | null = null;

/** Para las pruebas: cambia el worker real por uno falso y descarta el cliente actual. */
export function usarFabricaDeWorker(f: () => WorkerMinimo): void {
  cliente?.cerrar();
  cliente = null;
  fabrica = f;
}

function clienteActivo(): ClienteSim {
  cliente ??= new ClienteSim(() => fabrica(), {
    alProgreso: (hechas, total) => useApp.setState({ progreso: { hechas, total } }),
    alResultado: (comparacion) => {
      if (!entradasEnCurso) return;
      useApp.setState({
        fase: 'listo',
        progreso: { hechas: CORRIDAS_DEFECTO, total: CORRIDAS_DEFECTO },
        resultado: { id: ++idResultado, entradas: entradasEnCurso, comparacion },
        obsoleto: false,
        mensajeError: null,
      });
    },
    alError: (mensaje) => useApp.setState({ fase: 'error', progreso: null, mensajeError: mensaje }),
  });
  return cliente;
}

export const useApp = create<Estado>()((set, get) => {
  /** Las entradas cambiaron: lo que corre ya no sirve y lo que se ve deja de coincidir. */
  const alCambiarEntradas = () => {
    cliente?.invalidar();
    const s = get();
    if (s.fase === 'simulando') set({ fase: 'inactivo', progreso: null });
    else if (s.fase === 'cancelado' || s.fase === 'error') set({ fase: 'inactivo', progreso: null, mensajeError: null });
    if (get().resultado) set({ obsoleto: true });
  };

  return {
    texto: TEXTO_VACIO,
    horaSeleccion: '',
    intento: false,
    semilla: SEMILLA_DEFECTO,
    fase: 'inactivo',
    progreso: null,
    resultado: null,
    obsoleto: false,
    mensajeError: null,
    ayuda: null,

    poner(campo, valor) {
      set({ texto: { ...get().texto, [campo]: valor } });
      alCambiarEntradas();
    },

    ponerHora(seleccion) {
      const texto = { ...get().texto };
      if (seleccion !== '' && seleccion !== 'otra') texto.horaInicio = formatoHora(Number(seleccion));
      else if (seleccion === '') texto.horaInicio = '';
      set({ horaSeleccion: seleccion, texto });
      alCambiarEntradas();
    },

    cargarMiercoles() {
      const c = CASO_MIERCOLES;
      set({
        texto: {
          horaInicio: formatoHora(c.horaInicioMin),
          duracion: String(c.duracionMin),
          llegadasP1: String(c.llegadasP1),
          bajan: String(c.bajan),
          sillas: String(c.sillas),
          muletas: String(c.muletas),
          usosAseo: String(c.usosAseo),
        },
        horaSeleccion: String(c.horaInicioMin) as SeleccionHora,
        intento: false,
      });
      alCambiarEntradas();
    },

    simular() {
      const s = get();
      const v = validar(s.texto);
      if (!v.ok) {
        set({ intento: true });
        return CAMPOS.find((c) => v.errores[c] !== undefined) ?? null;
      }
      entradasEnCurso = v.entradas;
      set({
        intento: true,
        fase: 'simulando',
        progreso: { hechas: 0, total: CORRIDAS_DEFECTO },
        resultado: null,
        obsoleto: false,
        mensajeError: null,
      });
      clienteActivo().simular(v.entradas, s.semilla, CORRIDAS_DEFECTO);
      return null;
    },

    cancelar() {
      if (get().fase !== 'simulando') return;
      cliente?.cancelar();
      set({ fase: 'cancelado', progreso: null });
    },

    otraMuestra() {
      set({ semilla: otraSemilla(get().semilla) });
      return get().simular();
    },

    abrirAyuda(seccion) {
      set({ ayuda: seccion });
    },

    cerrarAyuda() {
      set({ ayuda: null });
    },
  };
});
