import { Fragment, type CSSProperties } from 'react';

interface Props {
  /** Lo que se enciende; sin valor, solo se ven los segmentos apagados. La coma decimal se escribe «,». */
  texto?: string;
  /** Forma del indicador con todos los segmentos: «88:88», «88,8». Fija el ancho. */
  plantilla: string;
  /** Lo que lee un lector de pantalla (el dibujo de segmentos no se lee bien). */
  etiqueta: string;
  tamano?: 'grande' | 'mediano' | 'chico';
  /** Orden de encendido cuando llegan los resultados (0 = primero). */
  orden?: number;
}

/**
 * DSEG7 no trae coma: la coma se dibuja con CSS (un punto cuadrado con cola, como los segmentos)
 * y ocupa el mismo ancho esté encendida o apagada, así el indicador no salta entre valores.
 */
function Capa({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(',').map((parte, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="d7-coma" />}
          {parte !== '' && <span>{parte}</span>}
        </Fragment>
      ))}
    </>
  );
}

/** Indicador de siete segmentos: los apagados van debajo y los encendidos encima, en ámbar. */
export function Display7({ texto, plantilla, etiqueta, tamano = 'mediano', orden = 0 }: Props) {
  return (
    <span className={`d7 d7-${tamano}`} role="img" aria-label={etiqueta} style={{ '--i': orden } as CSSProperties}>
      <span className="d7-fondo" aria-hidden="true">
        <Capa texto={plantilla} />
      </span>
      {texto !== undefined && (
        <span className="d7-valor" aria-hidden="true">
          <Capa texto={texto} />
        </span>
      )}
    </span>
  );
}
