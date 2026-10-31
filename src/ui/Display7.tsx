import type { CSSProperties } from 'react';

interface Props {
  /** Lo que se enciende; sin valor, solo se ven los segmentos apagados. */
  texto?: string;
  /** Forma del indicador con todos los segmentos: «88:88», «88.8». Fija el ancho. */
  plantilla: string;
  /** Lo que lee un lector de pantalla (el dibujo de segmentos no se lee bien). */
  etiqueta: string;
  tamano?: 'grande' | 'mediano' | 'chico';
  /** Orden de encendido cuando llegan los resultados (0 = primero). */
  orden?: number;
}

/** Indicador de siete segmentos: los apagados van debajo y los encendidos encima, en ámbar. */
export function Display7({ texto, plantilla, etiqueta, tamano = 'mediano', orden = 0 }: Props) {
  return (
    <span className={`d7 d7-${tamano}`} role="img" aria-label={etiqueta} style={{ '--i': orden } as CSSProperties}>
      <span className="d7-fondo" aria-hidden="true">
        {plantilla}
      </span>
      {texto !== undefined && (
        <span className="d7-valor" aria-hidden="true">
          {texto}
        </span>
      )}
    </span>
  );
}
