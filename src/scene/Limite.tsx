// Límites para la escena: sin WebGL, o si algo falla al dibujar, se muestra un aviso y el resto de la página
// (formulario y tabla) sigue funcionando.

import { Component, type ReactNode } from 'react';

/** ¿Hay WebGL disponible? Se prueba una sola vez. */
let hayWebGL: boolean | null = null;
export function webglDisponible(): boolean {
  if (hayWebGL !== null) return hayWebGL;
  try {
    const canvas = document.createElement('canvas');
    hayWebGL = !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    hayWebGL = false;
  }
  return hayWebGL;
}

interface Props {
  /** Qué mostrar si algo falla. */
  respaldo: (mensaje: string) => ReactNode;
  children: ReactNode;
}

/** Atrapa los errores de dibujo de la escena (React no tiene otra forma de hacerlo). */
export class LimiteDeErrores extends Component<Props, { error: string | null }> {
  override state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  override componentDidCatch(error: unknown) {
    console.error('Error en la escena 3D:', error);
  }

  override render() {
    return this.state.error === null ? this.props.children : this.props.respaldo(this.state.error);
  }
}
