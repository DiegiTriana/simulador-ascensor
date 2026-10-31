import { describe, expect, it } from 'vitest';
import { CASO_MIERCOLES } from '../data/casos.ts';
import { ClienteSim, type WorkerMinimo } from './cliente.ts';
import type { Peticion, Respuesta } from './protocolo.ts';

class FalsoWorker implements WorkerMinimo {
  enviados: Peticion[] = [];
  terminado = false;
  onmessage: ((ev: { data: Respuesta }) => void) | null = null;
  onerror: ((ev: { message?: string }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  postMessage(m: Peticion) {
    this.enviados.push(m);
  }
  terminate() {
    this.terminado = true;
  }
  responder(r: Respuesta) {
    this.onmessage?.({ data: r });
  }
}

function preparar() {
  const workers: FalsoWorker[] = [];
  const eventos: string[] = [];
  const cliente = new ClienteSim(
    () => {
      const w = new FalsoWorker();
      workers.push(w);
      return w;
    },
    {
      alProgreso: (h, t) => eventos.push(`progreso ${h}/${t}`),
      alTraza: () => eventos.push('traza'),
      alResultado: () => eventos.push('resultado'),
      alError: (m) => eventos.push(`error ${m}`),
    },
  );
  return { cliente, workers, eventos };
}

describe('cliente del worker', () => {
  it('manda la petición con la generación y entrega progreso y resultado de esa generación', () => {
    const { cliente, workers, eventos } = preparar();
    const g = cliente.simular(CASO_MIERCOLES, 1);
    expect(workers[0].enviados[0]).toMatchObject({ tipo: 'simular', generacion: g, semilla: 1, corridas: 10 });
    workers[0].responder({ tipo: 'progreso', generacion: g, hechas: 3, total: 10 });
    workers[0].responder({ tipo: 'resultado', generacion: g, comparacion: {} as never });
    expect(eventos).toEqual(['progreso 3/10', 'resultado']);
    expect(cliente.ocupado).toBe(false);
  });

  it('descarta lo que llega de una generación anterior (simular de nuevo)', () => {
    const { cliente, workers, eventos } = preparar();
    const g1 = cliente.simular(CASO_MIERCOLES, 1);
    const g2 = cliente.simular(CASO_MIERCOLES, 2);
    expect(g2).toBeGreaterThan(g1);
    workers[0].responder({ tipo: 'resultado', generacion: g1, comparacion: {} as never });
    workers[0].responder({ tipo: 'progreso', generacion: g1, hechas: 1, total: 10 });
    expect(eventos).toEqual([]);
    workers[0].responder({ tipo: 'resultado', generacion: g2, comparacion: {} as never });
    expect(eventos).toEqual(['resultado']);
  });

  it('cancelar avisa al worker e ignora un resultado que llegue tarde', () => {
    const { cliente, workers, eventos } = preparar();
    const g = cliente.simular(CASO_MIERCOLES, 1);
    cliente.cancelar();
    expect(workers[0].enviados.at(-1)).toEqual({ tipo: 'cancelar', generacion: g });
    expect(cliente.ocupado).toBe(false);
    workers[0].responder({ tipo: 'resultado', generacion: g, comparacion: {} as never });
    expect(eventos).toEqual([]);
  });

  it('invalidar (cambiaron las entradas) descarta el resultado en camino', () => {
    const { cliente, workers, eventos } = preparar();
    const g = cliente.simular(CASO_MIERCOLES, 1);
    cliente.invalidar();
    workers[0].responder({ tipo: 'resultado', generacion: g, comparacion: {} as never });
    expect(eventos).toEqual([]);
  });

  it('un error del worker llega como mensaje, y el siguiente intento usa un worker nuevo', () => {
    const { cliente, workers, eventos } = preparar();
    const g = cliente.simular(CASO_MIERCOLES, 1);
    workers[0].responder({ tipo: 'error', generacion: g, mensaje: 'algo falló' });
    expect(eventos).toEqual(['error algo falló']);
    expect(workers[0].terminado).toBe(true);
    cliente.simular(CASO_MIERCOLES, 1);
    expect(workers).toHaveLength(2);
  });

  it('un error no capturado del worker llega como mensaje', () => {
    const { cliente, workers, eventos } = preparar();
    cliente.simular(CASO_MIERCOLES, 1);
    workers[0].onerror?.({ message: 'boom' });
    expect(eventos).toEqual(['error boom']);
  });

  it('si no se puede crear el worker, avisa como mensaje y no lanza', () => {
    const eventos: string[] = [];
    const c = new ClienteSim(
      () => {
        throw new Error('sin workers');
      },
      { alProgreso: () => {}, alTraza: () => {}, alResultado: () => {}, alError: (m) => eventos.push(m) },
    );
    expect(() => c.simular(CASO_MIERCOLES, 1)).not.toThrow();
    expect(eventos).toEqual(['sin workers']);
  });

  it('entrega la traza de la generación vigente y descarta la de una anterior', () => {
    const { cliente, workers, eventos } = preparar();
    const g1 = cliente.simular(CASO_MIERCOLES, 1);
    const g2 = cliente.simular(CASO_MIERCOLES, 2);
    workers[0].responder({ tipo: 'traza', generacion: g1, traza: {} as never });
    expect(eventos).toEqual([]);
    workers[0].responder({ tipo: 'traza', generacion: g2, traza: {} as never });
    workers[0].responder({ tipo: 'resultado', generacion: g2, comparacion: {} as never });
    expect(eventos).toEqual(['traza', 'resultado']);
  });
});
