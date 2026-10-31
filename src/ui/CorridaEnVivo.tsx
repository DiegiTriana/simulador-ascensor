/** Lo que acompaña a la escena cuando hay una corrida: los cinco indicadores y los controles de reproducción. */
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { indicadoresEn, formatoReloj, type Indicadores } from '../scene/corrida.ts';
import { etiquetaPiso } from '../scene/medidas.ts';
import { CAPACIDAD_CABINA } from '../data/modelos.ts';
import { VELOCIDADES, useAnimacion, type Corrida } from '../store/animacion.ts';
import { FRASE_FIN_DE_FRANJA, fraccionDeFranja, minutosYSegundos, pasoLaFranja } from './reproductor.ts';

/** Segundo simulado de la corrida. Mientras corre se lee unas 7 veces por segundo; en pausa, solo cuando cambia. */
export function useSegundo(corrida: Corrida | null): number {
  const enMarcha = useAnimacion((s) => s.enMarcha);
  const saltos = useAnimacion((s) => s.saltos);
  const [t, ponerT] = useState(corrida?.reloj.t ?? 0);
  useEffect(() => {
    ponerT(corrida?.reloj.t ?? 0);
    if (!corrida || !enMarcha) return;
    const id = setInterval(() => ponerT(corrida.reloj.t), 150);
    return () => clearInterval(id);
  }, [corrida, enMarcha, saltos]);
  return t;
}

function FlechaDePiso({ sentido }: { sentido: Indicadores['sentido'] }) {
  if (sentido === 0) return null;
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={sentido < 0 ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M12 5 L20 18 H4 Z" fill="currentColor" />
    </svg>
  );
}

/** Reloj del día, piso de la cabina, ocupación, fila de P1 y quienes se han ido por las escaleras. */
export function IndicadoresEnVivo({ corrida }: { corrida: Corrida }) {
  const t = useSegundo(corrida);
  const i = useMemo(() => indicadoresEn(corrida.indice, t), [corrida, t]);
  const sentido = i.sentido === 0 ? 'parada' : i.sentido > 0 ? 'subiendo' : 'bajando';
  return (
    <section className="vivo" aria-label="Lo que pasa en la corrida">
      <p className="vivo-nota">
        Lo que ves es una de las 10 corridas<span className="vivo-nota-resto">; la tabla muestra el promedio de las 10.</span>
      </p>
      <dl className="vivo-datos">
        <div className="vivo-dato vivo-hora">
          <dt>Hora</dt>
          <dd>{formatoReloj(corrida.entradas.horaInicioMin, t)}</dd>
        </div>
        <div className="vivo-dato vivo-piso">
          <dt>Cabina en</dt>
          <dd>
            <FlechaDePiso sentido={i.sentido} />
            {etiquetaPiso(i.piso)}
            <span className="sr-only"> ({sentido})</span>
          </dd>
        </div>
        <div className="vivo-dato vivo-cabina">
          <dt>En la cabina</dt>
          <dd>
            {i.cupos} <span className="vivo-unidad">de {CAPACIDAD_CABINA}</span>
          </dd>
        </div>
        <div className="vivo-dato vivo-fila">
          <dt>Fila en P1</dt>
          <dd>
            {i.fila} <span className="vivo-unidad">{i.fila === 1 ? 'persona' : 'personas'}</span>
          </dd>
        </div>
        <div className="vivo-dato vivo-escaleras">
          <dt>Se van por las escaleras</dt>
          <dd>
            {i.escaleras} <span className="vivo-unidad">hasta ahora</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Icono({ tipo }: { tipo: 'play' | 'pausa' | 'repetir' | 'inicio' }) {
  const forma = {
    play: <path d="M7 4.5 L19 12 L7 19.5 Z" fill="currentColor" />,
    pausa: <path d="M6 4.5 H10 V19.5 H6 Z M14 4.5 H18 V19.5 H14 Z" fill="currentColor" />,
    repetir: (
      <path
        d="M12 5 A7 7 0 1 1 5.3 14 M12 5 L12 1.5 L8 5.2 L12 8.5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    inicio: <path d="M5 4.5 H7.5 V19.5 H5 Z M19 4.5 L9.5 12 L19 19.5 Z" fill="currentColor" />,
  }[tipo];
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {forma}
    </svg>
  );
}

/** Cuando el reloj pasa el fin de la franja, una frase corta sobre la escena. */
export function AvisoFinDeFranja({ corrida }: { corrida: Corrida }) {
  const t = useSegundo(corrida);
  if (!pasoLaFranja(t, corrida.entradas.duracionMin * 60, corrida.indice.fin)) return null;
  return (
    <p className="escena-franja" role="status">
      {FRASE_FIN_DE_FRANJA}
    </p>
  );
}

/** Pausa y reanuda, reiniciar, velocidad y una barra para ir a cualquier momento de la corrida. */
export function Reproductor({ corrida }: { corrida: Corrida }) {
  const enMarcha = useAnimacion((s) => s.enMarcha);
  const terminada = useAnimacion((s) => s.terminada);
  const velocidad = useAnimacion((s) => s.velocidad);
  const alternar = useAnimacion((s) => s.alternar);
  const reiniciar = useAnimacion((s) => s.reiniciar);
  const fijarVelocidad = useAnimacion((s) => s.fijarVelocidad);
  const saltarA = useAnimacion((s) => s.saltarA);
  const t = useSegundo(corrida);
  const fin = Math.floor(corrida.indice.fin);
  const franjaS = corrida.entradas.duracionMin * 60;
  const marca = fraccionDeFranja(franjaS, corrida.indice.fin);
  const despuesDeLaFranja = pasoLaFranja(t, franjaS, corrida.indice.fin);

  const nombre = terminada ? 'Ver de nuevo' : enMarcha ? 'Pausar' : 'Reanudar';
  return (
    <div className="reproductor" role="group" aria-label="Reproducción de la corrida">
      <button type="button" className="reproductor-boton" onClick={alternar} aria-label={nombre}>
        <Icono tipo={terminada ? 'repetir' : enMarcha ? 'pausa' : 'play'} />
        <span className="reproductor-texto" aria-hidden="true">
          {nombre}
        </span>
      </button>
      <button
        type="button"
        className="reproductor-boton"
        onClick={reiniciar}
        aria-label="Reiniciar la animación"
        title="Reiniciar la animación: vuelve al segundo 0 de esta corrida y queda en pausa"
      >
        <Icono tipo="inicio" />
        <span className="reproductor-texto" aria-hidden="true">
          Reiniciar
        </span>
      </button>
      <label className="reproductor-velocidad">
        <span className="reproductor-etiqueta">Velocidad</span>
        <select value={velocidad} onChange={(e: ChangeEvent<HTMLSelectElement>) => fijarVelocidad(Number(e.target.value))}>
          {VELOCIDADES.map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>
      </label>
      <label className="reproductor-barra" style={marca === null ? undefined : ({ '--marca': marca } as React.CSSProperties)}>
        <span className="sr-only">Momento de la corrida</span>
        <input
          type="range"
          min={0}
          max={fin}
          step={1}
          value={Math.min(fin, Math.floor(t))}
          aria-describedby={marca === null ? undefined : 'franja-fin'}
          aria-valuetext={`minuto ${minutosYSegundos(t)} de ${minutosYSegundos(fin)}, son las ${formatoReloj(corrida.entradas.horaInicioMin, t)}${despuesDeLaFranja ? ', ya terminó la franja' : ''}`}
          onChange={(e) => saltarA(Number(e.target.value))}
        />
        {marca !== null && (
          <>
            <span className="reproductor-marca" aria-hidden="true" title="Aquí termina la franja">
              <span className="reproductor-marca-texto">{minutosYSegundos(franjaS)}</span>
            </span>
            <span id="franja-fin" className="sr-only">
              La franja termina en el minuto {minutosYSegundos(franjaS)}.
            </span>
          </>
        )}
      </label>
      <span className="reproductor-tiempo" aria-hidden="true">
        {minutosYSegundos(t)} <span className="reproductor-total">de {minutosYSegundos(fin)}</span>
      </span>
    </div>
  );
}
