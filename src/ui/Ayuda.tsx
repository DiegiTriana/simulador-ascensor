import { useEffect, useRef } from 'react';
import { RANGOS } from '../data/rangos.ts';
import { ConSubindice } from './Subindice.tsx';
import { filasVacias } from './tabla.ts';

interface Props {
  abierta: boolean;
  alCerrar(): void;
}

const filas = filasVacias();

export function Ayuda({ abierta, alCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  return (
    <dialog
      ref={dialogo}
      className="ayuda"
      aria-labelledby="titulo-ayuda"
      onClose={alCerrar}
      onClick={(e) => {
        // Un clic en el fondo (fuera del contenido) cierra la hoja.
        if (e.target === dialogo.current) alCerrar();
      }}
    >
      <div className="ayuda-contenido">
        <div className="ayuda-cabecera">
          <h2 id="titulo-ayuda">Ayuda</h2>
          <button type="button" className="plano" onClick={alCerrar}>
            Cerrar
          </button>
        </div>

        <section>
          <h3>Qué es cada dato</h3>
          <dl>
            <dt>Hora de inicio</dt>
            <dd>
              La hora en que empieza el tramo que se simula. La lista trae los cambios de clase del horario de la universidad; «Otra hora» deja escribirla en formato de 24 horas, de 06:00 a 22:04.
            </dd>
            <dt>Duración</dt>
            <dd>
              Los minutos que dura el tramo, de {RANGOS.duracionMin.min} a {RANGOS.duracionMin.max}. La hora de inicio más la duración no puede pasar de las 22:05.
            </dd>
            <dt>Personas que llegan a P1 para subir</dt>
            <dd>De {RANGOS.llegadasP1.min} a {RANGOS.llegadasP1.max}. Cuentan también las personas en silla de ruedas y con muletas.</dd>
            <dt>Personas que bajan</dt>
            <dd>De {RANGOS.bajan.min} a {RANGOS.bajan.max}. Salen de clase en los pisos altos y bajan a P1, P2 o P3.</dd>
            <dt>Personas en silla de ruedas</dt>
            <dd>De {RANGOS.sillas.min} a {RANGOS.sillas.max}. Cada una ocupa 3 cupos de la cabina, sube primero y no se va por las escaleras.</dd>
            <dt>Personas con muletas</dt>
            <dd>De {RANGOS.muletas.min} a {RANGOS.muletas.max}. Cada una ocupa 2 cupos, sube primero y no se va por las escaleras.</dd>
            <dt>Veces que el aseo usa el ascensor</dt>
            <dd>De {RANGOS.usosAseo.min} a {RANGOS.usosAseo.max}. Cada vez, el ascensor queda ocupado 150 segundos.</dd>
          </dl>
          <p>
            No se pueden cambiar: la cabina es de 10 personas, el sistema admite 11 (K = 11: 10 en la cabina y 1 esperando), el ascensor tarda 5 segundos por piso y 85 de cada 100 personas que no caben se van por las escaleras.
          </p>
          <p>
            «Avanzado» guarda la semilla de la muestra aleatoria. Con los mismos datos y la misma semilla el resultado es siempre el mismo; «Otra muestra aleatoria» cambia la semilla y simula de nuevo.
          </p>
        </section>

        <section>
          <h3>Qué es cada fila de la tabla</h3>
          <dl>
            {filas.map((f) => (
              <div key={f.id}>
                <dt>{f.etiqueta}</dt>
                <dd>{f.detalle && <ConSubindice texto={f.detalle} />}</dd>
              </div>
            ))}
          </dl>
          <p>
            Las dos primeras columnas son las fórmulas del modelo M/M/1/K. La primera usa λ de toda la franja (personas ÷ duración); la segunda, λ de los picos. La tercera es la simulación segundo a segundo: el promedio de 10 corridas y, con ±, cuánto varía entre ellas. En la simulación, L, Lq, ρ y λ muestran el valor de toda la franja y, debajo, el de los picos.
          </p>
        </section>

        <section>
          <h3>¿Por qué las fórmulas dan menos personas que se van por las escaleras que lo que pasó de verdad?</h3>
          <p>
            El modelo de la clase supone que una persona se va solo cuando el sistema está lleno (10 en la cabina y 1 esperando). En el edificio, el ascensor atiende por tandas: sube hasta 10 personas y a quien no cabe en la cabina se le acaba la espera y 85 de cada 100 se van por las escaleras, aunque la fila sea corta. Por eso, con las mismas llegadas, las fórmulas dan alrededor de 4 a 6 % si se usa la capacidad que dice el documento (3,9 personas por minuto) y entre 10 y 13 % si se usa la que mide la simulación (unas 3,5 por minuto en promedio de muchas corridas; con solo 10 corridas puede salir entre 3,3 y 3,6), mientras que la simulación da cerca de 20 %, igual que el 20,6 % que se contó en la hora pico del miércoles. En ambos casos las fórmulas se quedan cortas.
          </p>
        </section>

        <section>
          <h3>¿De dónde salen λ y μ de la tabla?</h3>
          <p>
            λ son las personas que llegan por minuto (personas ÷ duración; en la hora pico, las que llegan dentro de los picos). μ son las personas que el ascensor sube por minuto cuando hay fila, medidas en la simulación. Los números de la tabla son el promedio de 10 corridas y el ± es la desviación entre corridas.
          </p>
        </section>

        <section>
          <h3>Nota sobre μ: 3,9 del documento y la que mide la simulación</h3>
          <p>
            El documento da μ = 3,9 personas por minuto. Esta página usa la μ que mide la simulación, como pide el plan: las personas que suben por minuto en las vueltas con fila llena. En el caso del miércoles sale cerca de 3,5 en promedio de muchas corridas; con solo 10 corridas puede salir entre 3,3 y 3,6, y esa es la cifra que muestra la tabla. La diferencia viene de la duración de la vuelta: en la simulación dura unos 165 segundos en promedio (entre 121 y 222), mientras que las vueltas medidas en el edificio duran unos 153 (entre 120 y 195). Con 10 personas por vuelta, 153 segundos dan 3,9 por minuto y 165 dan unas 3,6. Además, algunas vueltas suben menos de 10 porque entra una silla de ruedas o porque el cupo se ocupa con quienes bajan, y por eso la medida queda cerca de 3,5.
          </p>
          <p>
            La simulación carga a las personas de una en una, y en el edificio suelen llegar en grupos que van al mismo piso; eso probablemente alarga la vuelta simulada. Además, la comprobación con el miércoles se hizo con un solo día de hora pico, así que es una guía y no una prueba definitiva.
          </p>
        </section>

        <section>
          <h3>Créditos</h3>
          <ul>
            <li>Letra de los textos: Atkinson Hyperlegible, del Braille Institute of America (licencia SIL Open Font License 1.1).</li>
            <li>Dígitos de siete segmentos: DSEG7 Classic, de keshikan (licencia SIL Open Font License 1.1).</li>
            <li>Datos: «Datos del ascensor y plan de simulación» (documento de la profesora) y los datos recolectados en el edificio.</li>
            <li>Hecho con React, Zustand y Vite. Todo corre en tu navegador: la página no pide nada a otros sitios.</li>
          </ul>
        </section>
      </div>
    </dialog>
  );
}
