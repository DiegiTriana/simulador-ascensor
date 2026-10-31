// Lógica del worker sin tocar `self`: recibe peticiones y envía respuestas por una función.
// Así se prueba en Node igual que corre en el navegador.

import { comparar, semillaDeCorrida } from '../sim/corridas.ts';
import { validarEntradas } from '../sim/llegadas.ts';
import { CONFIG_DEFECTO, simularEntradas } from '../sim/simulacion.ts';
import type { Resultado } from '../sim/tipos.ts';
import type { Peticion, Respuesta } from './protocolo.ts';

/** Cede el hilo para que el worker pueda recibir un mensaje de cancelación entre corrida y corrida. */
const ceder = () => new Promise<void>((resolver) => setTimeout(resolver, 0));

export function crearNucleo(enviar: (r: Respuesta) => void) {
  /** Generación que debe seguir corriendo; cualquier otra se corta. */
  let vigente = -1;

  async function simular(p: Extract<Peticion, { tipo: 'simular' }>) {
    const { generacion, entradas, semilla, corridas } = p;
    vigente = generacion;
    try {
      if (!Number.isInteger(corridas) || corridas < 1 || corridas > 100) throw new RangeError('Número de corridas inválido');
      if (!Number.isFinite(semilla)) throw new RangeError('Semilla inválida');
      validarEntradas(entradas);
      const resultados: Resultado[] = [];
      enviar({ tipo: 'progreso', generacion, hechas: 0, total: corridas });
      for (let i = 0; i < corridas; i++) {
        await ceder();
        if (vigente !== generacion) {
          enviar({ tipo: 'cancelado', generacion });
          return;
        }
        resultados.push(simularEntradas(entradas, semillaDeCorrida(semilla, i), CONFIG_DEFECTO));
        enviar({ tipo: 'progreso', generacion, hechas: i + 1, total: corridas });
      }
      await ceder();
      if (vigente !== generacion) {
        enviar({ tipo: 'cancelado', generacion });
        return;
      }
      enviar({ tipo: 'resultado', generacion, comparacion: comparar(entradas, resultados) });
    } catch (e) {
      if (vigente === generacion) enviar({ tipo: 'error', generacion, mensaje: e instanceof Error ? e.message : String(e) });
    } finally {
      if (vigente === generacion) vigente = -1;
    }
  }

  return {
    /** Una petición nueva de `simular` cancela la que estuviera en marcha. */
    recibir(p: Peticion): void {
      if (p.tipo === 'cancelar') {
        if (vigente === p.generacion) vigente = -1;
        return;
      }
      void simular(p);
    },
  };
}
