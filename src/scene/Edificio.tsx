// El bloque alto de ladrillo claro (con balcones y ventanas), el terreno cortado que deja ver el sótano y
// unos árboles. Todo en colores planos de la paleta de los personajes, con bordes un poco redondeados.

import { useMemo } from 'react';
import { PALETA } from './paleta.ts';
import { Caja, CajasInstanciadas, type Instancia } from './piezas.tsx';
import { ALTURA_PISO, BLOQUE, PISO_MAXIMO, PISO_SIN_ACCESO, TORRE, Y_FONDO, Y_TECHO, yPiso } from './medidas.ts';
import type { Vec3 } from './vistas.ts';

const ANCHO_BLOQUE = BLOQUE.x1 - BLOQUE.x0;
const FONDO_BLOQUE = BLOQUE.z1 - BLOQUE.z0;
const X_CENTRO = (BLOQUE.x0 + BLOQUE.x1) / 2;

/** Centros de las ventanas a lo largo de la fachada del frente (x) y de los costados (z). */
const BAHIAS_FRENTE = [-12, -9, -6, -3];
const BAHIAS_COSTADO = [-2.4, 0, 2.4];
/** En estas bahías del frente hay balcón (de P2 a P9). */
const BAHIAS_CON_BALCON = [-12, -6];
const PISOS_CON_VENTANA = Array.from({ length: PISO_SIN_ACCESO }, (_, i) => i + 1);

interface Fachada {
  ventanas: Instancia[];
  ventanasApagadas: Instancia[];
  ventanasSotano: Instancia[];
  bandas: Instancia[];
  balcones: Instancia[];
  barandas: Instancia[];
}

/** Todas las piezas repetidas de las fachadas, como listas para dibujar en pocas llamadas. */
function construirFachada(): Fachada {
  const f: Fachada = { ventanas: [], ventanasApagadas: [], ventanasSotano: [], bandas: [], balcones: [], barandas: [] };
  const zFrente = BLOQUE.z1;
  for (const piso of PISOS_CON_VENTANA) {
    const y = yPiso(piso);
    const lista = piso === PISO_SIN_ACCESO ? f.ventanasApagadas : f.ventanas;
    for (const x of BAHIAS_FRENTE) {
      const conBalcon = BAHIAS_CON_BALCON.includes(x) && piso > 1 && piso <= PISO_MAXIMO;
      lista.push({
        posicion: [x, y + (conBalcon ? 1.05 : 1.5), zFrente + 0.015],
        tam: conBalcon ? [1.7, 1.8, 0.05] : [1.8, 1.2, 0.05],
      });
      if (conBalcon) {
        f.balcones.push({ posicion: [x, y - 0.06, zFrente + 0.5], tam: [2.5, 0.14, 1.0] });
        f.barandas.push(
          { posicion: [x, y + 0.34, zFrente + 0.97], tam: [2.46, 0.5, 0.06] },
          { posicion: [x - 1.2, y + 0.34, zFrente + 0.5], tam: [0.06, 0.5, 0.94] },
          { posicion: [x + 1.2, y + 0.34, zFrente + 0.5], tam: [0.06, 0.5, 0.94] },
        );
      }
    }
    for (const z of BAHIAS_COSTADO) {
      lista.push({ posicion: [BLOQUE.x0 - 0.015, y + 1.5, z], tam: [0.05, 1.2, 1.6] });
    }
    // Lo que se ve del costado derecho del bloque detrás de la torre.
    lista.push({ posicion: [BLOQUE.x1 + 0.015, y + 1.5, -2.3], tam: [0.05, 1.2, 1.6] });
  }
  // Una banda clara en cada losa, en el frente y en los dos costados.
  for (const piso of [...PISOS_CON_VENTANA, PISO_SIN_ACCESO + 1]) {
    const y = yPiso(piso) - 0.12;
    f.bandas.push(
      { posicion: [X_CENTRO, y, zFrente + 0.03], tam: [ANCHO_BLOQUE + 0.16, 0.26, 0.14] },
      { posicion: [BLOQUE.x0 - 0.03, y, 0], tam: [0.14, 0.26, FONDO_BLOQUE + 0.16] },
      { posicion: [BLOQUE.x1 + 0.03, y, 0], tam: [0.14, 0.26, FONDO_BLOQUE + 0.16] },
    );
  }
  // Sótano: ventanas bajas y pequeñas, apagadas.
  for (const x of BAHIAS_FRENTE) {
    f.ventanasSotano.push({ posicion: [x, Y_FONDO + 1.5, zFrente + 0.015], tam: [1.4, 0.7, 0.05] });
  }
  return f;
}

export function Edificio() {
  const fachada = useMemo(construirFachada, []);
  const altoCuerpo = Y_TECHO - Y_FONDO;
  return (
    <group>
      {/* Cuerpo de ladrillo claro, del sótano al techo. */}
      <Caja
        posicion={[X_CENTRO, Y_FONDO + altoCuerpo / 2, 0]}
        tam={[ANCHO_BLOQUE, altoCuerpo, FONDO_BLOQUE]}
        color={PALETA.durazno}
        radio={0.18}
      />
      {/* El sótano, por debajo del suelo, en un ladrillo más oscuro. */}
      <Caja
        posicion={[X_CENTRO, Y_FONDO + ALTURA_PISO / 2 - 0.05, 0.02]}
        tam={[ANCHO_BLOQUE + 0.04, ALTURA_PISO - 0.1, FONDO_BLOQUE + 0.04]}
        color={PALETA.cobre}
        radio={0.1}
      />
      <CajasInstanciadas instancias={fachada.bandas} color={PALETA.crema} />
      <CajasInstanciadas instancias={fachada.ventanas} color={PALETA.azul} />
      <CajasInstanciadas instancias={fachada.ventanasApagadas} color={PALETA.pizarra} />
      <CajasInstanciadas instancias={fachada.ventanasSotano} color={PALETA.negro} />
      <CajasInstanciadas instancias={fachada.balcones} color={PALETA.crema} sombra recibeSombra />
      <CajasInstanciadas instancias={fachada.barandas} color={PALETA.grisClaro} />
      <Techo />
      <Terreno />
      <Arbol posicion={[11.5, 0, -1.5]} escala={1.1} />
      <Arbol posicion={[13.8, 0, -7]} escala={1.4} />
      <Arbol posicion={[-18, 0, -3]} escala={1.2} />
    </group>
  );
}

/** Techo del bloque: losa clara, pretil y dos paneles solares azules. */
function Techo() {
  const y = Y_TECHO;
  return (
    <group>
      <Caja posicion={[X_CENTRO, y + 0.14, 0]} tam={[ANCHO_BLOQUE + 0.5, 0.28, FONDO_BLOQUE + 0.5]} color={PALETA.crema} radio={0.1} />
      <Caja posicion={[-10.5, y + 0.4, 1.2]} tam={[4.2, 0.12, 2.6]} color={PALETA.azul} radio={0.05} />
      <Caja posicion={[-4.5, y + 0.4, 1.2]} tam={[4.2, 0.12, 2.6]} color={PALETA.azul} radio={0.05} />
    </group>
  );
}

/**
 * El terreno es un corte: el edificio queda en el borde del frente y se ve el sótano. Hierba arriba, tierra
 * debajo. Bajo la torre solo hay tierra detrás del vidrio, para que se vea el hueco del pozo.
 */
function Terreno() {
  const hondo = 0.8 + ALTURA_PISO;
  const yTierra = -hondo / 2 - 0.02;
  const zFondo = -14;
  const zFrente = BLOQUE.z1;
  const piezas: { x0: number; x1: number; z0: number; z1: number }[] = [
    { x0: -22, x1: BLOQUE.x0, z0: zFondo, z1: zFrente },
    { x0: TORRE.x1, x1: 16, z0: zFondo, z1: zFrente },
    { x0: BLOQUE.x0, x1: TORRE.x1, z0: zFondo, z1: BLOQUE.z0 },
    { x0: TORRE.x0, x1: TORRE.x1, z0: BLOQUE.z0, z1: TORRE.z0 },
  ];
  return (
    <group>
      {piezas.map((p, i) => {
        const tam: Vec3 = [p.x1 - p.x0, hondo, p.z1 - p.z0];
        const c: Vec3 = [(p.x0 + p.x1) / 2, yTierra, (p.z0 + p.z1) / 2];
        return (
          <group key={i}>
            <Caja posicion={c} tam={tam} color={PALETA.tierra} radio={0.1} />
            <Caja posicion={[c[0], 0.05 - 0.14, c[2]]} tam={[tam[0] + 0.02, 0.3, tam[2] + 0.02]} color={PALETA.verde} radio={0.1} />
          </group>
        );
      })}
      {/* Suelo del sótano, debajo del edificio y la torre. */}
      <Caja
        posicion={[(BLOQUE.x0 + TORRE.x1) / 2, Y_FONDO - 0.45, (zFondo + zFrente) / 2]}
        tam={[TORRE.x1 - BLOQUE.x0, 0.7, zFrente - zFondo]}
        color={PALETA.tierra}
        radio={0.1}
      />
    </group>
  );
}

/** Árbol de pocas caras: tronco de bloque y dos copas facetadas. */
function Arbol({ posicion, escala }: { posicion: Vec3; escala: number }) {
  return (
    <group position={posicion} scale={escala}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.3, 1.6, 6]} />
        <meshStandardMaterial color={PALETA.ladrillo} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <icosahedronGeometry args={[1.35, 0]} />
        <meshStandardMaterial color={PALETA.verdeOscuro} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0.2, 3.7, 0.1]} castShadow>
        <icosahedronGeometry args={[0.95, 0]} />
        <meshStandardMaterial color={PALETA.verde} roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}
