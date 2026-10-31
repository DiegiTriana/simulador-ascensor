// Lado de la página: dueño del worker y del número de generación. Simular de nuevo, cancelar o
// cambiar las entradas sube la generación; todo mensaje de una generación anterior se descarta.

import type { Comparacion } from '../sim/corridas.ts';
import type { Entradas } from '../sim/tipos.ts';
import { CORRIDAS_DEFECTO, type Peticion, type Respuesta } from './protocolo.ts';

/** Lo mínimo que se usa de un Worker (permite probar con uno falso). */
export interface WorkerMinimo {
  postMessage(mensaje: Peticion): void;
  terminate(): void;
  onmessage: ((ev: { data: Respuesta }) => void) | null;
  onerror: ((ev: { message?: string }) => void) | null;
  onmessageerror?: (() => void) | null;
}

export interface Escuchas {
  alProgreso(hechas: number, total: number): void;
  alResultado(comparacion: Comparacion): void;
  alError(mensaje: string): void;
}

export class ClienteSim {
  private worker: WorkerMinimo | null = null;
  private generacion = 0;
  private enMarcha = false;

  constructor(
    private readonly crearWorker: () => WorkerMinimo,
    private readonly escuchas: Escuchas,
  ) {}

  get generacionActual(): number {
    return this.generacion;
  }

  get ocupado(): boolean {
    return this.enMarcha;
  }

  /** Empieza una corrida de varias simulaciones y devuelve su generación. Descarta la anterior. */
  simular(entradas: Entradas, semilla: number, corridas = CORRIDAS_DEFECTO): number {
    const generacion = ++this.generacion;
    const w = this.asegurarWorker();
    if (!w) return generacion;
    this.enMarcha = true;
    try {
      w.postMessage({ tipo: 'simular', generacion, entradas, semilla, corridas });
    } catch (e) {
      this.fallar(generacion, e instanceof Error ? e.message : String(e));
    }
    return generacion;
  }

  /** Cancela lo que corre; sus mensajes que lleguen después se ignoran. */
  cancelar(): void {
    if (!this.enMarcha) return;
    const generacion = this.generacion++;
    this.enMarcha = false;
    this.worker?.postMessage({ tipo: 'cancelar', generacion });
  }

  /** Las entradas cambiaron: lo que venga de la generación vigente ya no vale. */
  invalidar(): void {
    this.cancelar();
    this.generacion++;
  }

  cerrar(): void {
    this.generacion++;
    this.enMarcha = false;
    this.worker?.terminate();
    this.worker = null;
  }

  private asegurarWorker(): WorkerMinimo | null {
    if (this.worker) return this.worker;
    try {
      const w = this.crearWorker();
      w.onmessage = (ev) => this.recibir(ev.data);
      w.onerror = (ev) => this.fallar(this.generacion, ev.message || 'El cálculo se detuvo por un error inesperado.');
      w.onmessageerror = () => this.fallar(this.generacion, 'No se pudo leer la respuesta del cálculo.');
      this.worker = w;
      return w;
    } catch (e) {
      this.fallar(this.generacion, e instanceof Error ? e.message : 'No se pudo iniciar el cálculo.');
      return null;
    }
  }

  private fallar(generacion: number, mensaje: string): void {
    if (generacion !== this.generacion) return;
    this.enMarcha = false;
    // Un worker que dio error no es de fiar: el siguiente intento crea uno nuevo.
    this.worker?.terminate();
    this.worker = null;
    this.escuchas.alError(mensaje);
  }

  private recibir(r: Respuesta): void {
    if (r.generacion !== this.generacion) return;
    switch (r.tipo) {
      case 'progreso':
        this.escuchas.alProgreso(r.hechas, r.total);
        break;
      case 'resultado':
        this.enMarcha = false;
        this.escuchas.alResultado(r.comparacion);
        break;
      case 'cancelado':
        this.enMarcha = false;
        break;
      case 'error':
        this.fallar(r.generacion, r.mensaje);
        break;
    }
  }
}

/** Crea el worker real (solo en el navegador). */
export function crearWorkerReal(): WorkerMinimo {
  return new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerMinimo;
}
