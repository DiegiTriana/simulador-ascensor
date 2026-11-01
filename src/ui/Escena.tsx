/** Marco de la escena: el lienzo 3D (con sus límites de error), el selector de vista y el de piso. */
import { lazy, Suspense, useState } from 'react';
import { LimiteDeErrores, webglDisponible } from '../scene/Limite.tsx';
import { PISO_MAXIMO } from '../scene/medidas.ts';
import { useAnimacion } from '../store/animacion.ts';
import { useCalidad } from '../store/calidad.ts';
import { useEscena } from '../store/escena.ts';
import { VISTAS_CON_PISO, type Vista } from '../scene/vistas.ts';
import { useApp } from '../store/app.ts';
import { AvisoFinDeFranja, IndicadoresEnVivo, Reproductor } from './CorridaEnVivo.tsx';
import { irAResultados } from './foco.ts';

const Escena3D = lazy(() => import('../scene/Escena3D.tsx'));

const PISOS = Array.from({ length: PISO_MAXIMO }, (_, i) => i + 1);

export function Escena() {
  const vista = useEscena((s) => s.vista);
  const piso = useEscena((s) => s.piso);
  const corrida = useAnimacion((s) => s.corrida);
  const hayResultado = useApp((s) => s.resultado !== null);
  const [sinContexto, setSinContexto] = useState(false);
  const mostrar3D = webglDisponible() && !sinContexto;
  const descripcion = descripcionDe(vista, piso);
  const nivelDeCalidad = useCalidad((s) => s.nivel);

  return (
    <section className="escena" aria-label="Escena del ascensor" data-vista={vista}>
      {mostrar3D && corrida && (
        <IndicadoresEnVivo
          corrida={corrida}
          accion={
            hayResultado && (
              <button type="button" id="ver-resultados" className="ver-resultados" onClick={irAResultados}>
                Ver resultados
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M12 19 L4.5 8 H19.5 Z" fill="currentColor" />
                </svg>
              </button>
            )
          }
        />
      )}
      <div className="escena-lienzo" role={mostrar3D ? 'img' : undefined} aria-label={mostrar3D ? descripcion : undefined}>
        {mostrar3D ? (
          <LimiteDeErrores respaldo={(mensaje) => <AvisoSinEscena detalle={mensaje} />}>
            <Suspense fallback={<p className="escena-nota">Cargando la escena…</p>}>
              <Escena3D alPerderContexto={() => setSinContexto(true)} />
            </Suspense>
          </LimiteDeErrores>
        ) : (
          <AvisoSinEscena />
        )}
        {mostrar3D && corrida && <AvisoFinDeFranja corrida={corrida} />}
        {mostrar3D && !corrida && <span className="escena-etiqueta">Escena de muestra. Pulsa Simular para ver una corrida.</span>}
        {mostrar3D && nivelDeCalidad > 0 && (
          <span className="escena-calidad" role="status">
            Calidad reducida para que la escena vaya fluida.
          </span>
        )}
      </div>
      {mostrar3D && corrida && <Reproductor corrida={corrida} />}
      {mostrar3D && <BarraDeEscena />}
    </section>
  );
}

const DESCRIPCIONES: Record<Vista, (piso: number) => string> = {
  exterior: () => 'Vista exterior: el edificio de ladrillo con la torre de vidrio donde está el único ascensor.',
  piso: (piso) => `Vista desde el piso P${piso}: el pasillo frente a la puerta del ascensor.`,
  completo: () => 'Edificio completo, de frente: la torre de vidrio de sótano a P10 con la cabina y la gente que espera en cada piso.',
  planta: (piso) => `Planta del piso P${piso}, vista desde arriba: el pasillo, el vestíbulo y el pozo del ascensor.`,
};
const descripcionDe = (vista: Vista, piso: number) => DESCRIPCIONES[vista](piso);

const VISTAS: { vista: Vista; nombre: string }[] = [
  { vista: 'exterior', nombre: 'Exterior' },
  { vista: 'piso', nombre: 'Desde un piso' },
  { vista: 'completo', nombre: 'Edificio completo' },
  { vista: 'planta', nombre: 'Planta' },
];

function AvisoSinEscena({ detalle }: { detalle?: string }) {
  return (
    <div className="escena-nota escena-aviso" role="status">
      <p>
        <strong>No se pudo mostrar la escena 3D.</strong>
      </p>
      <p>Tu navegador o tu equipo no la pueden dibujar. Los datos, el botón Simular y los resultados funcionan igual.</p>
      {detalle && <p className="escena-detalle">Detalle técnico: {detalle}</p>}
    </div>
  );
}

function BarraDeEscena() {
  const vista = useEscena((s) => s.vista);
  const piso = useEscena((s) => s.piso);
  const fijarVista = useEscena((s) => s.fijarVista);
  const fijarPiso = useEscena((s) => s.fijarPiso);
  const cambiarPiso = useEscena((s) => s.cambiarPiso);
  const restablecerCamara = useEscena((s) => s.restablecerCamara);
  const verLaFila = useEscena((s) => s.verLaFila);

  return (
    <div className="escena-barra">
      <div className="segmentos" role="group" aria-label="Vista de la escena">
        {VISTAS.map((v) => (
          <button key={v.vista} type="button" aria-pressed={vista === v.vista} onClick={() => fijarVista(v.vista)}>
            {v.nombre}
          </button>
        ))}
      </div>

      {vista === 'exterior' ? (
        <div className="encuadres" role="group" aria-label="Acercar la cámara">
          <button type="button" onClick={restablecerCamara}>
            Ver todo
          </button>
          <button type="button" onClick={verLaFila}>
            Ver la fila
          </button>
        </div>
      ) : VISTAS_CON_PISO.includes(vista) ? (
        <div className="selector-piso" role="group" aria-label="Piso">
          <div className="pisos-lista">
            {PISOS.map((p) => (
              <button key={p} type="button" aria-pressed={piso === p} aria-label={`Piso ${p}`} onClick={() => fijarPiso(p)}>
                P{p}
              </button>
            ))}
          </div>
          <div className="pisos-paso">
            <button type="button" aria-label="Piso anterior" disabled={piso <= 1} onClick={() => cambiarPiso(-1)}>
              <Flecha abajo />
            </button>
            <output aria-live="polite">P{piso}</output>
            <button type="button" aria-label="Piso siguiente" disabled={piso >= PISO_MAXIMO} onClick={() => cambiarPiso(1)}>
              <Flecha />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Flecha({ abajo = false }: { abajo?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={abajo ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M12 6 L20 17 H4 Z" fill="currentColor" />
    </svg>
  );
}
