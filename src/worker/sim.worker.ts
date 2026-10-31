/// <reference lib="webworker" />
import { crearNucleo } from './nucleo.ts';
import type { Peticion, Respuesta } from './protocolo.ts';

const nucleo = crearNucleo((r: Respuesta) => self.postMessage(r));
self.onmessage = (ev: MessageEvent<Peticion>) => nucleo.recibir(ev.data);
self.onerror = (ev) => {
  self.postMessage({ tipo: 'error', generacion: -1, mensaje: String(typeof ev === 'string' ? ev : (ev as ErrorEvent).message) } satisfies Respuesta);
};
