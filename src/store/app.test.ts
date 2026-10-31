import { beforeEach, describe, expect, it } from 'vitest';
import { CASO_MIERCOLES } from '../data/casos.ts';
import type { WorkerMinimo } from '../worker/cliente.ts';
import type { Peticion, Respuesta } from '../worker/protocolo.ts';
import { corridaAnimada } from '../sim/corridas.ts';
import { useAnimacion } from './animacion.ts';
import { useApp, usarFabricaDeWorker } from './app.ts';

class FalsoWorker implements WorkerMinimo {
  enviados: Peticion[] = [];
  onmessage: ((ev: { data: Respuesta }) => void) | null = null;
  onerror: ((ev: { message?: string }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  postMessage(m: Peticion) {
    this.enviados.push(m);
  }
  terminate() {}
  responder(r: Respuesta) {
    this.onmessage?.({ data: r });
  }
}

let worker: FalsoWorker;

beforeEach(() => {
  worker = new FalsoWorker();
  usarFabricaDeWorker(() => worker);
  useApp.setState(useApp.getInitialState(), true);
  useAnimacion.setState(useAnimacion.getInitialState(), true);
});

const generacionEnviada = () => (worker.enviados.find((m) => m.tipo === 'simular') as Extract<Peticion, { tipo: 'simular' }>).generacion;

describe('estado de la aplicación', () => {
  it('cada «?» abre la Ayuda en su sección y se puede cerrar', () => {
    expect(useApp.getState().ayuda).toBeNull();
    useApp.getState().abrirAyuda('especiales');
    expect(useApp.getState().ayuda).toBe('especiales');
    useApp.getState().cerrarAyuda();
    expect(useApp.getState().ayuda).toBeNull();
  });

  it('no simula con la botonera vacía y devuelve el primer campo con error', () => {
    expect(useApp.getState().simular()).toBe('horaInicio');
    expect(useApp.getState().fase).toBe('inactivo');
    expect(useApp.getState().intento).toBe(true);
    expect(worker.enviados).toHaveLength(0);
  });

  it('el caso del miércoles llena las 7 entradas y se puede simular', () => {
    useApp.getState().cargarMiercoles();
    const s = useApp.getState();
    expect(s.texto).toMatchObject({ horaInicio: '12:40', duracion: '50', llegadasP1: '119', bajan: '19', sillas: '0', muletas: '0', usosAseo: '1' });
    expect(s.horaSeleccion).toBe('760');
    expect(s.simular()).toBeNull();
    expect(useApp.getState().fase).toBe('simulando');
    expect(worker.enviados[0]).toMatchObject({ tipo: 'simular', semilla: 1, corridas: 10, entradas: CASO_MIERCOLES });
  });

  it('muestra el progreso y deja el resultado con las entradas simuladas', () => {
    useApp.getState().cargarMiercoles();
    useApp.getState().simular();
    const g = generacionEnviada();
    worker.responder({ tipo: 'progreso', generacion: g, hechas: 5, total: 10 });
    expect(useApp.getState().progreso).toEqual({ hechas: 5, total: 10 });
    worker.responder({ tipo: 'resultado', generacion: g, comparacion: { sim: {} } as never });
    const s = useApp.getState();
    expect(s.fase).toBe('listo');
    expect(s.resultado?.entradas).toEqual(CASO_MIERCOLES);
    expect(s.obsoleto).toBe(false);
  });

  it('cancelar descarta lo que llegue después', () => {
    useApp.getState().cargarMiercoles();
    useApp.getState().simular();
    const g = generacionEnviada();
    useApp.getState().cancelar();
    expect(useApp.getState().fase).toBe('cancelado');
    worker.responder({ tipo: 'resultado', generacion: g, comparacion: { sim: {} } as never });
    expect(useApp.getState().fase).toBe('cancelado');
    expect(useApp.getState().resultado).toBeNull();
  });

  it('cambiar una entrada mientras corre descarta la simulación; después de terminar marca el resultado como viejo', () => {
    useApp.getState().cargarMiercoles();
    useApp.getState().simular();
    useApp.getState().poner('llegadasP1', '120');
    expect(useApp.getState().fase).toBe('inactivo');

    useApp.getState().simular();
    const g = worker.enviados.filter((m) => m.tipo === 'simular').at(-1) as Extract<Peticion, { tipo: 'simular' }>;
    worker.responder({ tipo: 'resultado', generacion: g.generacion, comparacion: { sim: {} } as never });
    expect(useApp.getState().fase).toBe('listo');
    useApp.getState().poner('bajan', '10');
    expect(useApp.getState().obsoleto).toBe(true);
  });

  it('un error del worker queda como mensaje', () => {
    useApp.getState().cargarMiercoles();
    useApp.getState().simular();
    worker.responder({ tipo: 'error', generacion: generacionEnviada(), mensaje: 'falló' });
    expect(useApp.getState()).toMatchObject({ fase: 'error', mensajeError: 'falló' });
  });

  it('elegir una hora de la lista llena el texto; «Otra hora» deja el texto para editarlo', () => {
    useApp.getState().ponerHora('830');
    expect(useApp.getState().texto.horaInicio).toBe('13:50');
    useApp.getState().ponerHora('otra');
    expect(useApp.getState().texto.horaInicio).toBe('13:50');
    expect(useApp.getState().horaSeleccion).toBe('otra');
  });

  it('otra muestra aleatoria cambia la semilla y vuelve a simular', () => {
    useApp.getState().cargarMiercoles();
    useApp.getState().otraMuestra();
    const m = worker.enviados[0] as Extract<Peticion, { tipo: 'simular' }>;
    expect(m.semilla).not.toBe(1);
    expect(useApp.getState().semilla).toBe(m.semilla);
  });

  describe('la corrida que se anima', () => {
    const traza = corridaAnimada(CASO_MIERCOLES, 1).traza;
    const simulada = () => {
      useApp.getState().cargarMiercoles();
      useApp.getState().simular();
      return generacionEnviada();
    };

    it('llega con la traza y queda con las entradas simuladas', () => {
      const g = simulada();
      expect(useAnimacion.getState().corrida).toBeNull();
      worker.responder({ tipo: 'traza', generacion: g, traza });
      const c = useAnimacion.getState().corrida;
      expect(c?.traza).toBe(traza);
      expect(c?.entradas).toEqual(CASO_MIERCOLES);
      expect(useAnimacion.getState().enMarcha).toBe(true);
    });

    it('simular de nuevo la descarta; la traza de la corrida anterior, si llega tarde, no la trae de vuelta', () => {
      const g1 = simulada();
      worker.responder({ tipo: 'traza', generacion: g1, traza });
      expect(useAnimacion.getState().corrida).not.toBeNull();
      useApp.getState().simular();
      expect(useAnimacion.getState().corrida).toBeNull();
      worker.responder({ tipo: 'traza', generacion: g1, traza });
      expect(useAnimacion.getState().corrida).toBeNull();
    });

    it('cambiar una entrada la descarta (y marca el resultado como viejo)', () => {
      const g = simulada();
      worker.responder({ tipo: 'traza', generacion: g, traza });
      worker.responder({ tipo: 'resultado', generacion: g, comparacion: { sim: {} } as never });
      expect(useAnimacion.getState().corrida).not.toBeNull();
      useApp.getState().poner('bajan', '10');
      expect(useAnimacion.getState().corrida).toBeNull();
      expect(useApp.getState().obsoleto).toBe(true);
    });

    it('cancelar y cargar otro caso la descartan', () => {
      const g = simulada();
      worker.responder({ tipo: 'traza', generacion: g, traza });
      useApp.getState().cancelar();
      expect(useAnimacion.getState().corrida).toBeNull();
      useApp.getState().cargarMiercoles();
      useApp.getState().simular();
      const g2 = (worker.enviados.filter((m) => m.tipo === 'simular').at(-1) as Extract<Peticion, { tipo: 'simular' }>).generacion;
      worker.responder({ tipo: 'traza', generacion: g2, traza });
      expect(useAnimacion.getState().corrida).not.toBeNull();
      useApp.getState().cargarMiercoles();
      expect(useAnimacion.getState().corrida).toBeNull();
    });
  });
});
