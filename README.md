# Simulador del ascensor (UDES)

Simulador web de **un solo ascensor** (cabina de 10 personas, paradas S y P1–P9) de un edificio de la UDES. Es un proyecto de Modelos Matemáticos: compara el modelo de colas M/M/1/K de la clase con una simulación segundo a segundo y muestra la corrida en una escena 3D.

**Pruébalo aquí:** <ENLACE-A-LA-APP>

## Qué responde

**¿Cuántas personas se van por las escaleras en la hora pico, y por qué las fórmulas M/M/1/K se quedan cortas?**

Con el caso del miércoles (12:40, 50 minutos, 119 personas que llegan a P1 para subir, 19 que bajan, 1 uso del aseo), en los picos se contaron **20,6 %** de personas que se fueron por las escaleras. La simulación da cerca de **20 %** (promedio de 10 corridas); las fórmulas de clase dan entre **4 y 13 %**, según la capacidad μ que se use.

La razón: el modelo supone que alguien se va solo cuando el sistema está lleno (10 en la cabina y 1 esperando, K = 11). En el edificio el ascensor atiende por tandas: sube hasta 10 personas y a quien no cabe se le acaba la espera, y 85 de cada 100 se van por las escaleras aunque la fila sea corta. Ningún valor de K lo arregla. La Ayuda de la página explica el detalle.

## Cómo usarlo

1. Pulsa **Cargar el caso del miércoles**, o escribe tus propios datos: hora de inicio, duración, personas que llegan a P1 para subir, personas que bajan, sillas de ruedas, muletas y usos del aseo.
2. Pulsa **Simular**. Se simula 10 veces la misma franja y se promedia.
3. Mira la escena: es **una de las 10 corridas** (la tabla muestra el promedio de las 10). Puedes pausar, ir a cualquier momento, cambiar la velocidad y cambiar de vista (exterior, desde un piso, edificio completo y planta).
4. Lee los resultados: la frase principal, las tres barras (lo contado el miércoles, la simulación y las fórmulas) y el «Detalle para la clase», con la tabla comparativa (ρ, L, Lq, W, Wq, λef y P<sub>K</sub>).

Con la misma semilla (en «Avanzado») y los mismos datos el resultado es siempre el mismo. Todo corre en tu navegador; la página no pide nada a otros sitios.

## Cómo correrlo en tu computador

Necesitas [Node.js](https://nodejs.org) 22.18 o más nuevo (Vite 8 pide 22.12 y los scripts de `scripts/` corren TypeScript directo).

```
npm install
npm run dev        # desarrollo, en http://localhost:5173/
npm test           # pruebas (Vitest)
npm run typecheck  # tipos (TypeScript)
npm run build      # genera dist/
npm run preview    # sirve dist/ tal como quedará publicado
npm run tabla      # imprime la tabla del miércoles en la consola
```

La ruta de la página publicada sale de `NOMBRE_REPO` en [vite.config.ts](vite.config.ts). `npm run build` y `npm run preview` usan `/NOMBRE_REPO/`; `npm run dev`, la raíz.

## Cómo está hecho

Vite, React, TypeScript, React Three Fiber y Drei (escena 3D), Zustand (estado) y Vitest (pruebas). La simulación corre en un Web Worker.

- `src/sim/`: fórmulas M/M/1/K y simulación por segundo, en TypeScript puro y con pruebas.
- `src/worker/`: el Web Worker (progreso, cancelación, errores).
- `src/store/`: estado de la aplicación y de la animación.
- `src/ui/`: formulario, resultados, tabla y Ayuda.
- `src/scene/`: escena 3D.
- `src/data/`: parámetros, horario de clases y caso del miércoles.
- `public/modelos/`, `public/fuentes/`: modelos y letra, locales.

El despliegue a GitHub Pages lo hace [.github/workflows/desplegar.yml](.github/workflows/desplegar.yml).

## Limitaciones

- **Solo se simulan tres flujos:** las personas que llegan a P1 para subir, las que bajan después de un cambio de clase y los usos del aseo, porque son los que se contaron en el estudio. Los viajes entre pisos altos y el abandono en pisos altos no se observaron, así que no se incluyen ni se inventan.
- **La validación es de un solo día de pico** (el miércoles). Es una guía, no una prueba definitiva.
- **La simulación carga a las personas de una en una.** En el edificio suelen llegar en grupos que van al mismo piso; eso probablemente alarga la vuelta simulada (unos 165 s contra 153 s medidos).
- **μ medida y μ del documento:** la tabla usa la μ que mide la simulación (cerca de 3,5 personas por minuto), no los 3,9 del documento. La Ayuda explica la diferencia.
- **Un solo ascensor:** no existe un segundo, ni en la simulación ni en la escena.
- La cabina de la escena se dibuja más grande que la real para que quepan 10 personas sin solaparse; la capacidad sigue siendo 10.
- Necesita WebGL para la escena 3D. Sin WebGL, el formulario y los resultados funcionan igual.

## Créditos

- **Personajes, silla de ruedas y muleta:** paquete «Mini Characters» de [Kenney](https://kenney.nl/assets/mini-characters), licencia [Creative Commons Zero (CC0)](https://creativecommons.org/publicdomain/zero/1.0/). Se recortaron los clips de animación que no se usan, se ajustó el tamaño y se comprimieron.
- **Letra:** [Atkinson Hyperlegible](https://brailleinstitute.org/freefont), del Braille Institute of America, licencia [SIL Open Font License 1.1](public/fuentes/OFL-Atkinson-Hyperlegible.txt). Se sirve desde `public/fuentes/` (ver [public/fuentes/LICENCIAS.md](public/fuentes/LICENCIAS.md)).
- **Datos:** «Datos del ascensor y plan de simulación» (documento de la profesora) y los datos recolectados en el edificio.
- **Hecho con** React, React Three Fiber, Drei, three.js, Zustand y Vite.
