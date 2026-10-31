// Fase 4: prepara los modelos de Kenney (Mini Characters, CC0) que usa la escena.
// Uso: npm run modelos
//
// Lee los GLB de modelos-candidatos/, deja solo los clips que se usan, quita los atributos que no se
// usan (TANGENT, TEXCOORD_1), lleva cada persona a la misma altura (ALTURA_PERSONA), comprime con
// Meshopt y escribe en public/modelos/ los 9 GLB y la textura compartida colormap.png.
//
// El escalado se hornea en los datos (posiciones, huesos, matrices inversas y animaciones de
// traslación) y no en un nodo: un nodo con escala sobre una malla con esqueleto se aplicaría dos veces.
//
// La compresión usa el paquete meshoptimizer, que llega como dependencia de @types/three.

import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { ALTURA_PERSONA, CLIPS_ASEO, CLIPS_ESTUDIANTE, ESTUDIANTES, MODELO_ASEO, MODELO_MULETA, MODELO_SILLA } from '../src/data/modelos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const ORIGEN = path.join(RAIZ, 'modelos-candidatos/kenney-mini-characters/Models/GLB format');
const DESTINO = path.join(RAIZ, 'public/modelos');
const ATRIBUTOS = ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0'];
const MUESTRAS_IDLE = 12;

type Json = any;

interface Glb {
  json: Json;
  bin: Buffer;
}

interface Vista {
  datos: Uint8Array;
  /** Bytes por elemento (vértice, índice o matriz). */
  paso: number;
  cuenta: number;
  modo: 'ATTRIBUTES' | 'TRIANGLES';
}

interface Modelo {
  json: Json;
  vistas: Vista[];
}

function leerGlb(archivo: string): Glb {
  const b = fs.readFileSync(archivo);
  const largoJson = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + largoJson).toString('utf8'));
  const binInicio = 20 + largoJson + 8;
  return { json, bin: b.subarray(binInicio, binInicio + b.readUInt32LE(20 + largoJson)) };
}

const TIPOS: Record<number, { ctor: new (n: number) => ArrayBufferView & { length: number; [i: number]: number }; bytes: number }> = {
  5120: { ctor: Int8Array, bytes: 1 },
  5121: { ctor: Uint8Array, bytes: 1 },
  5122: { ctor: Int16Array, bytes: 2 },
  5123: { ctor: Uint16Array, bytes: 2 },
  5125: { ctor: Uint32Array, bytes: 4 },
  5126: { ctor: Float32Array, bytes: 4 },
};
const COMPONENTES: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

/** Lee un accesor del GLB de origen como un arreglo propio (sin salto de bytes). */
function leerAccesor(g: Glb, i: number) {
  const a = g.json.accessors[i];
  const vista = g.json.bufferViews[a.bufferView];
  const { ctor, bytes } = TIPOS[a.componentType];
  const n = COMPONENTES[a.type];
  const salto = vista.byteStride ?? n * bytes;
  const inicio = (vista.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const salida = new ctor(a.count * n);
  const dv = new DataView(g.bin.buffer, g.bin.byteOffset, g.bin.byteLength);
  const lector: Record<number, (o: number) => number> = {
    5120: (o) => dv.getInt8(o),
    5121: (o) => dv.getUint8(o),
    5122: (o) => dv.getInt16(o, true),
    5123: (o) => dv.getUint16(o, true),
    5125: (o) => dv.getUint32(o, true),
    5126: (o) => dv.getFloat32(o, true),
  };
  for (let e = 0; e < a.count; e++) {
    for (let c = 0; c < n; c++) salida[e * n + c] = lector[a.componentType](inicio + e * salto + c * bytes);
  }
  return { datos: salida, tipo: a.type as string, componentType: a.componentType as number, normalized: a.normalized as boolean | undefined };
}

class Constructor {
  accesores: Json[] = [];
  vistas: Vista[] = [];
  vistasJson: Json[] = [];

  agregar(datos: ArrayBufferView & { length: number; [i: number]: number }, tipo: string, componentType: number, opciones: { indices?: boolean; normalized?: boolean; limites?: boolean } = {}): number {
    const n = COMPONENTES[tipo];
    const paso = n * TIPOS[componentType].bytes;
    const cuenta = datos.length / n;
    if (!opciones.indices && paso % 4 !== 0) throw new Error(`Paso de ${paso} bytes: Meshopt pide múltiplos de 4`);
    const accesor: Json = { bufferView: this.vistas.length, componentType, count: cuenta, type: tipo };
    if (opciones.normalized) accesor.normalized = true;
    if (opciones.limites) {
      const min = Array<number>(n).fill(Infinity);
      const max = Array<number>(n).fill(-Infinity);
      for (let e = 0; e < cuenta; e++) {
        for (let c = 0; c < n; c++) {
          min[c] = Math.min(min[c], datos[e * n + c]);
          max[c] = Math.max(max[c], datos[e * n + c]);
        }
      }
      accesor.min = min;
      accesor.max = max;
    }
    this.vistas.push({
      datos: new Uint8Array(datos.buffer, datos.byteOffset, datos.byteLength),
      paso,
      cuenta,
      modo: opciones.indices ? 'TRIANGLES' : 'ATTRIBUTES',
    });
    this.vistasJson.push(opciones.indices ? { target: 34963 } : { target: 34962, byteStride: paso });
    this.accesores.push(accesor);
    return this.accesores.length - 1;
  }
}

interface Opciones {
  clips: readonly string[];
  /** Factor de escala que se hornea en el modelo. */
  factor: number;
}

/** Reconstruye el GLB solo con lo que se usa, escalado por `factor`. */
function reconstruir(g: Glb, { clips, factor }: Opciones): Modelo {
  const c = new Constructor();
  const j = g.json;
  const nodos: Json[] = structuredClone(j.nodes);
  for (const n of nodos) if (n.translation) n.translation = n.translation.map((v: number) => v * factor);

  const mallas: Json[] = j.meshes.map((m: Json) => ({
    name: m.name,
    primitives: m.primitives.map((p: Json) => {
      const atributos: Record<string, number> = {};
      for (const nombre of ATRIBUTOS) {
        if (p.attributes[nombre] === undefined) continue;
        const a = leerAccesor(g, p.attributes[nombre]);
        if (nombre === 'POSITION') for (let k = 0; k < a.datos.length; k++) a.datos[k] *= factor;
        atributos[nombre] = c.agregar(a.datos, a.tipo, a.componentType, { normalized: a.normalized, limites: nombre === 'POSITION' });
      }
      const ind = leerAccesor(g, p.indices);
      // Meshopt solo codifica índices de 2 o 4 bytes (la muleta trae índices de 1 byte).
      const indices = c.agregar(Uint16Array.from(ind.datos), ind.tipo, 5123, { indices: true });
      return { attributes: atributos, indices, material: p.material, mode: p.mode };
    }),
  }));

  const pieles: Json[] = (j.skins ?? []).map((s: Json) => {
    const ibm = leerAccesor(g, s.inverseBindMatrices);
    // Matrices por columnas: la traslación está en los elementos 12, 13 y 14 de cada una.
    for (let m = 0; m < ibm.datos.length; m += 16) for (const k of [12, 13, 14]) ibm.datos[m + k] *= factor;
    return { ...s, inverseBindMatrices: c.agregar(ibm.datos, ibm.tipo, ibm.componentType) };
  });

  const cache = new Map<string, number>();
  const accesorAnim = (i: number, escalar: boolean) => {
    const clave = `${i}:${escalar}`;
    if (!cache.has(clave)) {
      const a = leerAccesor(g, i);
      if (escalar) for (let k = 0; k < a.datos.length; k++) a.datos[k] *= factor;
      cache.set(clave, c.agregar(a.datos, a.tipo, a.componentType, { limites: a.tipo === 'SCALAR' }));
    }
    return cache.get(clave) as number;
  };
  const animaciones: Json[] = (j.animations ?? [])
    .filter((a: Json) => clips.includes(a.name))
    .map((a: Json) => {
      const muestreadores: Json[] = [];
      const canales: Json[] = a.channels.map((ch: Json) => {
        const s = a.samplers[ch.sampler];
        muestreadores.push({ input: accesorAnim(s.input, false), output: accesorAnim(s.output, ch.target.path === 'translation'), interpolation: s.interpolation });
        return { sampler: muestreadores.length - 1, target: ch.target };
      });
      return { name: a.name, channels: canales, samplers: muestreadores };
    });
  const faltan = clips.filter((n) => !animaciones.some((a) => a.name === n));
  if (faltan.length > 0) throw new Error(`Faltan clips: ${faltan.join(', ')}`);

  const material = { name: j.materials[0].name, doubleSided: j.materials[0].doubleSided, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0 } };
  const json: Json = {
    asset: { version: '2.0', generator: 'scripts/preparar-modelos.ts (Kenney, CC0)' },
    scene: j.scene ?? 0,
    scenes: j.scenes,
    nodes: nodos,
    meshes: mallas,
    materials: [material],
    textures: [{ sampler: 0, source: 0, name: 'colormap' }],
    images: [{ uri: 'colormap.png', name: 'colormap' }],
    samplers: j.samplers,
    accessors: c.accesores,
    bufferViews: c.vistasJson,
  };
  if (pieles.length > 0) json.skins = pieles;
  if (animaciones.length > 0) json.animations = animaciones;
  return { json, vistas: c.vistas };
}

const alinear = (n: number) => (n + 3) & ~3;

/** Escribe el GLB. Con `comprimir`, cada vista va con EXT_meshopt_compression y un buffer de reserva vacío. */
async function empaquetar(m: Modelo, { comprimir, sinTextura = false }: { comprimir: boolean; sinTextura?: boolean }): Promise<Buffer> {
  await MeshoptEncoder.ready;
  const json: Json = structuredClone(m.json);
  const trozos: Uint8Array[] = [];
  let desplazamiento = 0;
  let sinComprimir = 0;
  json.bufferViews = m.vistas.map((v, i) => {
    const base = json.bufferViews[i];
    const datos = comprimir ? MeshoptEncoder.encodeGltfBuffer(v.datos, v.cuenta, v.paso, v.modo) : v.datos;
    const relleno = alinear(datos.length) - datos.length;
    trozos.push(datos, new Uint8Array(relleno));
    const inicio = desplazamiento;
    desplazamiento += datos.length + relleno;
    if (!comprimir) return { ...base, buffer: 0, byteOffset: inicio, byteLength: datos.length };
    const vista: Json = { ...base, buffer: 1, byteOffset: sinComprimir, byteLength: v.datos.length };
    sinComprimir += alinear(v.datos.length);
    vista.extensions = {
      EXT_meshopt_compression: { buffer: 0, byteOffset: inicio, byteLength: datos.length, byteStride: v.paso, count: v.cuenta, mode: v.modo },
    };
    return vista;
  });
  json.buffers = [{ byteLength: desplazamiento }];
  if (comprimir) {
    json.buffers.push({ byteLength: sinComprimir, extensions: { EXT_meshopt_compression: { fallback: true } } });
    json.extensionsUsed = ['EXT_meshopt_compression'];
    json.extensionsRequired = ['EXT_meshopt_compression'];
  }
  if (sinTextura) {
    delete json.textures;
    delete json.images;
    delete json.samplers;
    for (const mat of json.materials) delete mat.pbrMetallicRoughness.baseColorTexture;
  }
  const bin = Buffer.concat(trozos);
  const textoJson = Buffer.from(JSON.stringify(json), 'utf8');
  const relJson = Buffer.alloc(alinear(textoJson.length) - textoJson.length, 0x20);
  const largoJson = textoJson.length + relJson.length;
  const cabecera = Buffer.alloc(12);
  cabecera.writeUInt32LE(0x46546c67, 0);
  cabecera.writeUInt32LE(2, 4);
  cabecera.writeUInt32LE(12 + 8 + largoJson + 8 + bin.length, 8);
  const trozoJson = Buffer.alloc(8);
  trozoJson.writeUInt32LE(largoJson, 0);
  trozoJson.writeUInt32LE(0x4e4f534a, 4);
  const trozoBin = Buffer.alloc(8);
  trozoBin.writeUInt32LE(bin.length, 0);
  trozoBin.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([cabecera, trozoJson, textoJson, relJson, trozoBin, bin]);
}

interface Medida {
  alto: number;
  ancho: number;
  fondo: number;
  minY: number;
  triangulos: number;
}

/** Carga el GLB (sin textura) con el cargador de three, con el clip `idle` promediado en un ciclo. */
async function medir(glb: Buffer, clip: string | null): Promise<Medida> {
  const cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const ab = glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer;
  const g = await new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>((ok, mal) => cargador.parse(ab, '', ok, mal));
  const mezclador = new THREE.AnimationMixer(g.scene);
  const animacion = clip ? THREE.AnimationClip.findByName(g.animations, clip) : null;
  const accion = animacion ? mezclador.clipAction(animacion).play() : null;
  const total = { alto: 0, ancho: 0, fondo: 0, minY: Infinity };
  const muestras = accion && animacion ? MUESTRAS_IDLE : 1;
  for (let k = 0; k < muestras; k++) {
    if (accion && animacion) mezclador.setTime((animacion.duration * k) / muestras);
    g.scene.updateMatrixWorld(true);
    const caja = new THREE.Box3().setFromObject(g.scene, true);
    const t = caja.getSize(new THREE.Vector3());
    total.alto += t.y / muestras;
    total.ancho += t.x / muestras;
    total.fondo += t.z / muestras;
    total.minY = Math.min(total.minY, caja.min.y);
  }
  let triangulos = 0;
  g.scene.traverse((o) => {
    const malla = o as THREE.Mesh;
    if (malla.isMesh) triangulos += (malla.geometry.index?.count ?? malla.geometry.attributes.position.count) / 3;
  });
  return { ...total, triangulos };
}

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
const archivoOrigen = (nombre: string) => path.join(ORIGEN, `${nombre}.glb`);

async function main() {
  fs.mkdirSync(DESTINO, { recursive: true });
  const personas: { nombre: string; clips: readonly string[] }[] = [
    ...ESTUDIANTES.map((nombre) => ({ nombre: nombre as string, clips: CLIPS_ESTUDIANTE })),
    { nombre: MODELO_ASEO, clips: CLIPS_ASEO },
  ];

  // 1) Factor de cada persona: ALTURA_PERSONA entre su altura de pie (clip idle, media de un ciclo).
  const factores = new Map<string, number>();
  for (const p of personas) {
    const crudo = reconstruir(leerGlb(archivoOrigen(p.nombre)), { clips: p.clips, factor: 1 });
    const m = await medir(await empaquetar(crudo, { comprimir: false, sinTextura: true }), 'idle');
    factores.set(p.nombre, ALTURA_PERSONA / m.alto);
  }
  // Silla y muleta: el factor medio de las personas (la silla y la muleta no tienen altura de persona).
  const factorObjetos = [...factores.values()].reduce((s, f) => s + f, 0) / factores.size;

  // 2) Escribir los finales y medirlos otra vez, ya comprimidos.
  const filas: string[] = [];
  let antesTotal = 0;
  let despuesTotal = 0;
  const objetos = [MODELO_SILLA, MODELO_MULETA].map((nombre) => ({ nombre, clips: [] as readonly string[] }));
  for (const p of [...personas, ...objetos]) {
    const origen = archivoOrigen(p.nombre);
    const factor = factores.get(p.nombre) ?? factorObjetos;
    const final = await empaquetar(reconstruir(leerGlb(origen), { clips: p.clips, factor }), { comprimir: true });
    fs.writeFileSync(path.join(DESTINO, `${p.nombre}.glb`), final);
    const verificado = await medir(await empaquetar(reconstruir(leerGlb(origen), { clips: p.clips, factor }), { comprimir: true, sinTextura: true }), p.clips.includes('idle') ? 'idle' : null);
    const antes = fs.statSync(origen).size;
    antesTotal += antes;
    despuesTotal += final.length;
    filas.push(
      `| ${p.nombre}.glb | ${kb(antes)} | ${kb(final.length)} | ${verificado.triangulos} | ${p.clips.length} | ${factor.toFixed(3)} | ${verificado.alto.toFixed(3)} | ${verificado.ancho.toFixed(3)} | ${verificado.fondo.toFixed(3)} | ${verificado.minY.toFixed(3)} |`,
    );
  }
  const textura = path.join(ORIGEN, 'Textures/colormap.png');
  fs.copyFileSync(textura, path.join(DESTINO, 'colormap.png'));
  const pesoTextura = fs.statSync(textura).size;

  console.log('| Archivo | Antes | Después | Triángulos | Clips | Factor | Alto | Ancho | Fondo | Y mín. |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const f of filas) console.log(f);
  console.log(`\nGLB antes (con 32 clips y datos sin usar): ${kb(antesTotal)}; después: ${kb(despuesTotal)}`);
  console.log(`Textura compartida colormap.png: ${kb(pesoTextura)} (antes iba una copia por archivo en el pack)`);
  console.log(`Total en public/modelos/: ${kb(despuesTotal + pesoTextura)}`);
  console.log('Alto, ancho y fondo: media de un ciclo del clip idle (las personas) o la pieza tal cual (silla y muleta), en metros de escena.');
}

await main();
