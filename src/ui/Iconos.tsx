// Íconos pequeños en el estilo de los personajes: cabeza de cubo, formas redondeadas, colores planos.
// Son decoración (aria-hidden): el nombre de cada campo ya dice lo mismo con palabras.

import type { ReactNode } from 'react';

const TINTA = '#38383D';
const PIEL = '#F2BF99';
const PELO = '#B06041';

/** Cabeza de cubo con pelo y ojos; (x, y) es la esquina de arriba a la izquierda y t el lado. */
function Cabeza({ x, y, t }: { x: number; y: number; t: number }) {
  const ojo = t * 0.2;
  return (
    <>
      <rect x={x} y={y} width={t} height={t} rx={t * 0.26} fill={PIEL} />
      <path d={`M${x} ${y + t * 0.55}v${-t * 0.2}a${t * 0.26} ${t * 0.26} 0 0 1 ${t * 0.26}-${t * 0.26}h${t * 0.48}a${t * 0.26} ${t * 0.26} 0 0 1 ${t * 0.26} ${t * 0.26}v${t * 0.2}z`} fill={PELO} />
      <rect x={x + t * 0.22} y={y + t * 0.62} width={ojo} height={ojo} rx={ojo * 0.3} fill={TINTA} />
      <rect x={x + t * 0.58} y={y + t * 0.62} width={ojo} height={ojo} rx={ojo * 0.3} fill={TINTA} />
    </>
  );
}

function Persona({ camisa }: { camisa: string }) {
  return (
    <>
      <rect x="15" y="26" width="18" height="15" rx="5" fill={camisa} />
      <Cabeza x={14} y={6} t={20} />
    </>
  );
}

function Flecha({ sube }: { sube: boolean }) {
  return (
    <>
      <circle cx="37" cy="37" r="9" fill="#FFFFFF" stroke={TINTA} strokeWidth="2.2" />
      <path
        d={sube ? 'M37 42V32m-4.5 4.5L37 32l4.5 4.5' : 'M37 32v10m-4.5-4.5L37 42l4.5-4.5'}
        stroke={TINTA}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

/** Persona sentada en una silla de ruedas, vista de lado: rueda grande, respaldo y reposapiés bien marcados. */
function SillaDeRuedas() {
  return (
    <>
      <Cabeza x={20} y={3} t={14} />
      <rect x="21" y="19" width="12" height="14" rx="4" fill="#3F9E68" />
      <rect x="14" y="17" width="4.5" height="26" rx="2.2" fill={TINTA} />
      <rect x="21" y="31" width="19" height="6" rx="3" fill="#3A4A8C" />
      <rect x="36" y="31" width="5.5" height="13" rx="2.5" fill="#3A4A8C" />
      <rect x="34" y="42" width="11" height="4" rx="2" fill={TINTA} />
      <circle cx="24" cy="37" r="9.5" fill="#FFFFFF" stroke={TINTA} strokeWidth="4" />
      <circle cx="24" cy="37" r="2.2" fill={TINTA} />
    </>
  );
}

/** Persona de pie con dos muletas bajo los brazos. */
function Muletas() {
  return (
    <>
      <Cabeza x={17} y={3} t={14} />
      <rect x="17" y="19" width="14" height="14" rx="4.5" fill="#E8742F" />
      <rect x="18" y="32" width="5" height="13" rx="2" fill="#3A4A8C" />
      <rect x="25" y="32" width="5" height="13" rx="2" fill="#3A4A8C" />
      <path d="M11 21h8M29 21h8" stroke={TINTA} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M13 22 7 46M35 22l6 24" stroke={TINTA} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M10 33h6M32 33h6" stroke={TINTA} strokeWidth="3.6" strokeLinecap="round" />
    </>
  );
}

function Carrito() {
  return (
    <>
      <path d="M10 18h26l-3 20H13z" fill="#4F78B0" stroke={TINTA} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M15 18V9h18" stroke={TINTA} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="29" y="6" width="8" height="5" rx="2" fill="#FFC044" stroke={TINTA} strokeWidth="1.8" />
      <circle cx="16" cy="42" r="3.4" fill={TINTA} />
      <circle cx="30" cy="42" r="3.4" fill={TINTA} />
    </>
  );
}

function Reloj() {
  return (
    <>
      <circle cx="24" cy="24" r="17" fill="#FFFFFF" stroke={TINTA} strokeWidth="3" />
      <path d="M24 13v11l7 4" stroke={TINTA} strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function ArenaDeReloj() {
  return (
    <>
      <path d="M12 5h24v8l-8 11 8 11v8H12v-8l8-11-8-11z" fill="#FFC044" stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
      <path d="M17 11h14M17 38h14" stroke={TINTA} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

function Ascensor() {
  return (
    <>
      <rect x="11" y="4" width="26" height="40" rx="5" fill="#D0E8FF" stroke={TINTA} strokeWidth="3" />
      <path d="M24 4v40" stroke={TINTA} strokeWidth="3" />
      <path d="M17 19l-3 3m3-3 3 3M31 29l-3-3m3 3 3-3" stroke={TINTA} strokeWidth="2.6" strokeLinecap="round" />
    </>
  );
}

export type NombreIcono = 'hora' | 'duracion' | 'suben' | 'bajan' | 'silla' | 'muleta' | 'aseo' | 'fila' | 'espera' | 'vuelta';

const DIBUJOS: Record<NombreIcono, ReactNode> = {
  hora: <Reloj />,
  duracion: <ArenaDeReloj />,
  suben: (
    <>
      <Persona camisa="#4F78B0" />
      <Flecha sube />
    </>
  ),
  bajan: (
    <>
      <Persona camisa="#8366B4" />
      <Flecha sube={false} />
    </>
  ),
  silla: <SillaDeRuedas />,
  muleta: <Muletas />,
  aseo: <Carrito />,
  fila: <Persona camisa="#FFC044" />,
  espera: <Reloj />,
  vuelta: <Ascensor />,
};

export function Icono({ nombre, grande = false }: { nombre: NombreIcono; grande?: boolean }) {
  return (
    <svg className={grande ? 'icono icono-grande' : 'icono'} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {DIBUJOS[nombre]}
    </svg>
  );
}

/** Una cabecita del pictograma; la marcada lleva una escalera debajo y un fondo distinto. */
export function CabezaPictograma({ seVa }: { seVa: boolean }) {
  return (
    <svg className={seVa ? 'cabeza cabeza-va' : 'cabeza'} viewBox="0 0 36 44" aria-hidden="true" focusable="false">
      <g transform="translate(5 3)">
        <Cabeza x={0} y={0} t={26} />
      </g>
      {seVa && <path d="M5 41h6v-4h6v-4h6v-4h6" stroke={TINTA} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
